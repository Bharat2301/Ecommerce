const Razorpay = require('razorpay');
const prisma = require('../prisma/client');
const { z } = require('zod');
const crypto = require('crypto');
const { confirmOrder } = require('./orderController');
const sanitizeHtml = require('sanitize-html');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const createOrderSchema = z.object({
  amount: z.number().positive('Amount must be positive'),
  currency: z.literal('INR', { errorMap: () => ({ message: 'Currency must be INR' }) }),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      price: z.number().positive('Price must be positive'),
      size: z.string().optional(),
    })
  ).min(1, 'At least one item is required'),
  discount: z.number().min(0, 'Discount cannot be negative').default(0),
  offerCode: z.string().optional().nullable(),
  shippingDetails: z.object({
    name: z.string().min(1, 'Name is required'),
    email: z.string().email('Invalid email'),
    phone: z.string().regex(/^\d{10}$/, 'Phone must be 10 digits'),
    address: z.string().min(1, 'Address is required'),
    pincode: z.string().regex(/^\d{6}$/, 'Pincode must be 6 digits'),
    city: z.string().min(1, 'City is required'),
    state: z.string().optional(),
  }),
});

const verifyPaymentSchema = z.object({
  orderId: z.string().min(1, 'Razorpay order ID is required'),
  paymentId: z.string().min(1, 'Payment ID is required'),
  signature: z.string().min(1, 'Signature is required'),
  dbOrderId: z.string().min(1, 'Database order ID is required'),
});

// Sanitize shipping details to prevent XSS
const sanitizeShippingDetails = (details) => ({
  name: sanitizeHtml(details.name),
  email: sanitizeHtml(details.email),
  phone: sanitizeHtml(details.phone),
  address: sanitizeHtml(details.address),
  pincode: sanitizeHtml(details.pincode),
  city: sanitizeHtml(details.city),
  state: details.state ? sanitizeHtml(details.state) : undefined,
});

// Retry mechanism for Razorpay API calls
const withRetry = async (operation, maxRetries = 3) => {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 429 && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
        logger.warn(`[${uuidv4()}] Rate limit hit, retrying in ${delay}ms... (Attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw new Error('Max retries reached');
};

// Validate cart consistency
const validateCartItems = async (userId, items) => {
  const cart = await prisma.cart.findFirst({
    where: { userId },
    include: { items: true },
  });

  if (!cart) return false;

  const cartItemsMap = new Map(cart.items.map(item => [`${item.productId}-${item.size || 'default'}`, item]));
  for (const item of items) {
    const key = `${item.productId}-${item.size || 'default'}`;
    const cartItem = cartItemsMap.get(key);
    if (!cartItem || cartItem.quantity < item.quantity || Math.abs(cartItem.price - item.price) > 0.01) {
      return false;
    }
  }
  return true;
};

const createOrder = async (req, res) => {
  const requestId = uuidv4();
  try {
    const { amount, currency, items, discount, offerCode, shippingDetails } = createOrderSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      logger.error(`[${requestId}] User not authenticated for createOrder`, { requestBody: req.body });
      return res.status(401).json({ success: false, error: 'User not authenticated', requestId });
    }

    // Validate cart consistency
    const isCartValid = await validateCartItems(userId, items);
    if (!isCartValid) {
      logger.error(`[${requestId}] Cart items do not match server cart`, { userId, items });
      return res.status(400).json({ success: false, error: 'Cart items do not match server cart', requestId });
    }

    const sanitizedShippingDetails = sanitizeShippingDetails(shippingDetails);

    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        price: true,
        sizes: true,
        stockBySize: true,
        version: true,
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    let calculatedTotal = 0;
    const itemDetails = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        logger.error(`[${requestId}] Product not found: ${item.productId}`, { userId });
        return res.status(404).json({ success: false, error: `Product ${item.productId} not found`, requestId });
      }

      if (Math.abs(item.price - product.price) > 0.01) {
        logger.error(`[${requestId}] Price mismatch for ${product.name}: expected ₹${product.price}, got ₹${item.price}`, { userId });
        return res.status(400).json({
          success: false,
          error: `Price mismatch for product ${product.name}: expected ₹${product.price}, got ₹${item.price}`,
          requestId,
        });
      }

      const stockBySize = product.stockBySize || {};
      const size = item.size || 'default';
      if (product.sizes?.length && !item.size) {
        logger.error(`[${requestId}] Size required for product: ${product.name}`, { userId });
        return res.status(400).json({ success: false, error: `Size is required for ${product.name}`, requestId });
      }
      if (!stockBySize[size] || stockBySize[size] < item.quantity) {
        logger.error(`[${requestId}] Insufficient stock for ${product.name} in size ${size}`, { userId });
        return res.status(400).json({ success: false, error: `Insufficient stock for ${product.name} in size ${size}`, requestId });
      }

      calculatedTotal += item.price * item.quantity;
      itemDetails.push({ productId: product.id, name: product.name, price: item.price, quantity: item.quantity, size });
    }

    calculatedTotal = Number(calculatedTotal.toFixed(2));
    let appliedDiscount = 0;

    if (offerCode) {
      const offer = await prisma.offerCode.findUnique({ 
        where: { code: offerCode.toUpperCase() },
        select: { id: true, discount: true, expiryDate: true, isFirstOrder: true }
      });
      if (!offer) {
        logger.error(`[${requestId}] Invalid offer code: ${offerCode}`, { userId });
        return res.status(400).json({ success: false, error: 'Invalid offer code', requestId });
      }

      if (offer.expiryDate && offer.expiryDate < new Date()) {
        logger.error(`[${requestId}] Expired offer code: ${offerCode}`, { userId });
        return res.status(400).json({ success: false, error: 'Offer code has expired', requestId });
      }

      const codeUsed = await prisma.userOfferCode.findFirst({
        where: { userId, offerCodeId: offer.id },
      });
      if (codeUsed) {
        logger.error(`[${requestId}] Offer code already used: ${offerCode}`, { userId });
        return res.status(400).json({ success: false, error: 'This offer code has already been used', requestId });
      }

      const userOrderCount = await prisma.order.count({ where: { userId } });
      if (offer.isFirstOrder && userOrderCount > 0) {
        logger.error(`[${requestId}] First-order offer code not applicable: ${offerCode}`, { userId });
        return res.status(400).json({ success: false, error: 'Offer code is only for first orders', requestId });
      }

      appliedDiscount = offer.discount;
      if (discount !== appliedDiscount) {
        logger.error(`[${requestId}] Discount mismatch: expected ${appliedDiscount}%, got ${discount}%`, { userId });
        return res.status(400).json({
          success: false,
          error: `Discount mismatch: expected ${appliedDiscount}%, got ${discount}%`,
          requestId,
        });
      }
    } else if (discount !== 0) {
      logger.error(`[${requestId}] Discount provided without an offer code`, { userId });
      return res.status(400).json({ success: false, error: 'Discount provided without an offer code', requestId });
    }

    const expectedAmount = Number((calculatedTotal * (1 - appliedDiscount / 100)).toFixed(2));
    if (Math.abs(expectedAmount - amount) > 0.01) {
      logger.error(`[${requestId}] Total amount mismatch: expected ₹${expectedAmount}, got ₹${amount}`, { userId });
      return res.status(400).json({
        success: false,
        error: `Total amount mismatch: expected ₹${expectedAmount}, got ₹${amount}`,
        details: {
          calculatedTotal,
          appliedDiscount,
          expectedAmount,
          receivedAmount: amount,
          items: itemDetails,
          offerCode,
        },
        requestId,
      });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert rupees to paise for Razorpay
      currency,
      receipt: `receipt_order_${requestId}`,
    };

    const razorpayOrder = await withRetry(() => razorpay.orders.create(options));

    const order = await prisma.$transaction(async (tx) => {
      // Update stock within transaction
      for (const item of items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
          select: { stockBySize: true, version: true },
        });
        if (!product) throw new Error(`Product ${item.productId} not found`);
        const stockBySize = product.stockBySize || {};
        const size = item.size || 'default';
        if (stockBySize[size] < item.quantity) {
          throw new Error(`Insufficient stock for ${item.productId} in size ${size}`);
        }
        stockBySize[size] -= item.quantity;
        await tx.product.update({
          where: { id: item.productId, version: product.version },
          data: { stockBySize, version: { increment: 1 } },
        });
      }

      const createdOrder = await tx.order.create({
        data: {
          userId,
          totalAmount: amount,
          status: 'pending',
          paymentId: razorpayOrder.id,
          offerCode: offerCode ? offerCode.toUpperCase() : null,
          discount: appliedDiscount,
          shippingDetails: { ...sanitizedShippingDetails },
          orderItems: {
            create: items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              size: item.size,
            })),
          },
        },
      });

      if (offerCode) {
        const offer = await tx.offerCode.findUnique({ where: { code: offerCode.toUpperCase() } });
        if (offer) {
          await tx.userOfferCode.create({
            data: {
              userId,
              offerCodeId: offer.id,
            },
          });
        }
      }

      return createdOrder;
    });

    logger.info(`[${requestId}] Razorpay order created`, {
      orderId: razorpayOrder.id,
      dbOrderId: order.id,
      amount,
      userId,
    });
    return res.json({
      success: true,
      data: {
        orderId: razorpayOrder.id,
        dbOrderId: order.id,
        amount,
        currency,
        requestId,
      },
    });
  } catch (err) {
    logger.error(`[${requestId}] Create order error`, {
      message: err.message,
      stack: err.stack,
      userId: req.user?.id,
      requestBody: {
        ...req.body,
        shippingDetails: req.body.shippingDetails
          ? { ...req.body.shippingDetails, email: '[REDACTED]', phone: '[REDACTED]' }
          : undefined,
      },
    });
    return res.status(500).json({
      success: false,
      error: err instanceof z.ZodError
        ? err.errors.map((e) => e.message).join(', ')
        : err.message.includes('Razorpay')
          ? 'Payment processing failed. Please try again later.'
          : 'Failed to create order',
      requestId,
    });
  }
};

const verifyPayment = async (req, res) => {
  const requestId = uuidv4();
  try {
    const { orderId, paymentId, signature, dbOrderId } = verifyPaymentSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      logger.error(`[${requestId}] User not authenticated for verifyPayment`, { userId });
      return res.status(401).json({ success: false, error: 'User not authenticated', requestId });
    }

    // Verify Razorpay signature
    const generatedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    if (generatedSignature !== signature) {
      logger.error(`[${requestId}] Invalid payment signature`, { userId });
      return res.status(400).json({ success: false, error: 'Invalid payment signature', requestId });
    }

    // Fetch payment details from Razorpay
    const payment = await withRetry(() => razorpay.payments.fetch(paymentId));
    if (payment.status !== 'captured') {
      logger.error(`[${requestId}] Payment not captured`, { paymentId, status: payment.status, userId });
      return res.status(400).json({ success: false, error: 'Payment not captured', requestId });
    }

    // Verify order exists and belongs to user
    const order = await prisma.order.findUnique({
      where: { id: dbOrderId },
      select: { userId: true, status: true },
    });

    if (!order) {
      logger.error(`[${requestId}] Order not found`, { dbOrderId, userId });
      return res.status(404).json({ success: false, error: 'Order not found', requestId });
    }

    if (order.userId !== userId) {
      logger.error(`[${requestId}] Unauthorized access to order`, { dbOrderId, userId });
      return res.status(403).json({ success: false, error: 'Not authorized to verify this order', requestId });
    }

    if (order.status !== 'pending') {
      logger.error(`[${requestId}] Order already processed`, { dbOrderId, status: order.status, userId });
      return res.status(400).json({ success: false, error: 'Order already processed', requestId });
    }

    // Call confirmOrder to finalize the order
    await confirmOrder(
      { ...req, body: { dbOrderId, paymentId } },
      res,
      () => {}
    );

    logger.info(`[${requestId}] Payment verified successfully`, { paymentId, dbOrderId, userId });
    return res.json({
      success: true,
      message: 'Payment verified and order confirmed',
      requestId,
    });
  } catch (err) {
    logger.error(`[${requestId}] Verify payment error`, {
      message: err.message,
      stack: err.stack,
      userId: req.user?.id,
      requestBody: req.body,
    });
    return res.status(500).json({
      success: false,
      error: err instanceof z.ZodError
        ? err.errors.map((e) => e.message).join(', ')
        : 'Failed to verify payment',
      requestId,
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
};