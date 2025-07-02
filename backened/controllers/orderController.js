const prisma = require('../prisma/client');
const { createShiprocketOrder, getTrackingInfo } = require('../utils/shiprocket');
const { z } = require('zod');
const { logger } = require('../utils/logger');

const confirmOrderSchema = z.object({
  dbOrderId: z.string().min(1, 'Order ID is required'),
  paymentId: z.string().min(1, 'Payment ID is required'),
});

// Zod schema for validating shippingDetails
const shippingDetailsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  city: z.string().min(1, 'City is required'),
  pincode: z.string().min(1, 'Pincode is required'),
  phone: z.string().min(1, 'Phone is required'),
  state: z.string().optional(),
});

const confirmOrder = async (req, res) => {
  try {
    const { dbOrderId, paymentId } = confirmOrderSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      logger.error('User not authenticated for confirmOrder', { userId });
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const order = await prisma.order.findUnique({
      where: { id: dbOrderId },
      include: {
        user: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!order) {
      logger.error(`Order not found: ${dbOrderId}`, { userId });
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.userId !== userId) {
      logger.error(`Unauthorized access to order ${dbOrderId} by user ${userId}`);
      return res.status(403).json({ success: false, error: 'Not authorized to confirm this order' });
    }

    if (!order.shippingDetails) {
      logger.error(`Shipping details missing for order ${dbOrderId}`, { userId });
      return res.status(400).json({ success: false, error: 'Shipping details are required' });
    }

    // Validate shippingDetails using Zod
    let shippingDetails;
    try {
      shippingDetails = shippingDetailsSchema.parse(order.shippingDetails);
    } catch (error) {
      logger.error(`Invalid shipping details for order ${dbOrderId}`, { userId, error: error.message });
      return res.status(400).json({ success: false, error: 'Invalid shipping details format' });
    }

    // Validate and update stock
    const stockUpdates = [];
    for (const item of order.orderItems) {
      const product = await prisma.product.findUnique({ where: { id: item.productId } });
      if (!product) {
        logger.error(`Product not found: ${item.productId}`, { userId });
        return res.status(404).json({ success: false, error: `Product not found` });
      }

      const stockBySize = product.stockBySize || {};
      const size = item.size || 'default';
      if (product.sizes?.length && !item.size) {
        logger.error(`Size required for product: ${product.name}`, { userId });
        return res.status(400).json({ success: false, error: `Size is required for ${product.name}` });
      }
      if (!stockBySize[size] || stockBySize[size] < item.quantity) {
        logger.error(`Insufficient stock for ${product.name} in size ${size}`, { userId });
        return res.status(400).json({ success: false, error: `Insufficient stock for ${product.name} in size ${size}` });
      }

      stockBySize[size] -= item.quantity;
      const totalStock = Object.values(stockBySize).reduce((sum, val) => sum + val, 0);

      stockUpdates.push(
        prisma.product.update({
          where: { id: item.productId },
          data: {
            quantity: totalStock,
            stockBySize,
            orderCount: { increment: item.quantity },
          },
        })
      );
    }

    const productItems = order.orderItems.map((item) => ({
      name: item.product?.name || 'Unknown Product',
      sku: `SKU_${item.productId}`,
      units: item.quantity,
      selling_price: item.price,
    }));

    if (productItems.length === 0) {
      logger.error(`No products found in order ${dbOrderId}`, { userId });
      return res.status(400).json({ success: false, error: 'No products found in the order' });
    }

    const shiprocketData = {
      order_id: dbOrderId,
      order_date: new Date().toISOString(),
      pickup_location: 'Primary',
      billing_customer_name: shippingDetails.name,
      billing_last_name: '',
      billing_address: shippingDetails.address,
      billing_city: shippingDetails.city,
      billing_pincode: shippingDetails.pincode,
      billing_state: shippingDetails.state || '',
      billing_country: 'India',
      billing_phone: shippingDetails.phone,
      shipping_is_billing: true,
      order_items: productItems,
      payment_method: 'Prepaid',
      sub_total: order.totalAmount,
      length: 10,
      breadth: 10,
      height: 10,
      weight: 0.5,
    };

    const shiprocketResponse = await createShiprocketOrder(shiprocketData);

    await prisma.$transaction([
      ...stockUpdates,
      prisma.order.update({
        where: { id: dbOrderId },
        data: {
          status: 'confirmed',
          paymentId,
          shiprocketOrderId: shiprocketResponse.order_id || null,
          trackingUrl: shiprocketResponse.tracking_url || '',
        },
      }),
      // Clear cart
      prisma.cartItem.deleteMany({ where: { cart: { userId } } }),
      prisma.cart.deleteMany({ where: { userId } }),
      prisma.user.update({
        where: { id: userId },
        data: { cartId: null },
      }),
    ]);

    logger.info(`Confirmed order ${dbOrderId} for user ${userId}`, { shiprocketOrderId: shiprocketResponse.order_id });
    return res.json({
      success: true,
      data: { orderId: dbOrderId, shiprocketOrderId: shiprocketResponse.order_id },
    });
  } catch (error) {
    logger.error('Confirm order error', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      requestBody: req.body,
    });
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to confirm order',
    });
  }
};

const getOrderTracking = async (req, res) => {
  try {
    const { orderId } = z.object({ orderId: z.string().min(1) }).parse(req.params);
    const userId = req.user?.id;

    if (!userId) {
      logger.error('User not authenticated for getOrderTracking', { userId });
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: true },
    });

    if (!order) {
      logger.error(`Order not found: ${orderId}`, { userId });
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    if (order.userId !== userId) {
      logger.error(`Unauthorized access to order ${orderId} by user ${userId}`);
      return res.status(403).json({ success: false, error: 'Not authorized to track this order' });
    }

    if (!order.shiprocketOrderId) {
      logger.error(`Tracking not available for order ${orderId}`, { userId });
      return res.status(404).json({ success: false, error: 'Tracking not available' });
    }

    const trackingInfo = await getTrackingInfo(order.shiprocketOrderId);
    logger.info(`Fetched tracking for order ${orderId}`, { userId, trackingInfo });
    return res.json({ success: true, data: { order, tracking: trackingInfo } });
  } catch (error) {
    logger.error('Get tracking info error', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch tracking info',
    });
  }
};

const getAllOrders = async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      logger.error('Admin access required for getAllOrders', { userId: req.user?.id });
      return res.status(403).json({ success: false, error: 'Admin access required' });
    }

    const orders = await prisma.order.findMany({
      include: {
        user: true,
        orderItems: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    logger.info(`Fetched ${orders.length} orders for admin`, { userId: req.user?.id });
    return res.status(200).json({ success: true, data: orders });
  } catch (error) {
    logger.error('Fetch orders error', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
    });
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to fetch orders',
    });
  }
};

module.exports = {
  confirmOrder,
  getOrderTracking,
  getAllOrders,
};