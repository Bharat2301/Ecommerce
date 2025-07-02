const prisma = require('../prisma/client');
const { z } = require('zod');
const { logger } = require('../utils/logger');

const applyOfferCodeSchema = z.object({
  code: z.string().min(1, 'Offer code is required'),
  cartTotal: z.number().positive('Cart total must be positive'),
  items: z.array(
    z.object({
      productId: z.string().min(1, 'Product ID is required'),
      quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      price: z.number().positive('Price must be positive'),
      size: z.string().optional(),
    })
  ),
});

const applyOfferCode = async (req, res) => {
  try {
    const { code, cartTotal, items } = applyOfferCodeSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      logger.error('User not authenticated for applyOfferCode', { userId });
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    if (!items || items.length === 0) {
      logger.error('No cart items provided', { userId });
      return res.status(400).json({ success: false, error: 'Cart items are required' });
    }

    // Validate cart items
    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    let calculatedTotal = 0;

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        logger.error(`Product not found: ${item.productId}`, { userId });
        return res.status(404).json({ success: false, error: `Product not found` });
      }

      if (Math.abs(item.price - product.price) > 0.01) {
        logger.error(`Price mismatch for ${product.name}: expected ₹${product.price}, got ₹${item.price}`, { userId });
        return res.status(400).json({
          success: false,
          error: `Price mismatch for product ${product.name}: expected ₹${product.price}, got ₹${item.price}`,
        });
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

      calculatedTotal += item.price * item.quantity;
    }

    calculatedTotal = Number(calculatedTotal.toFixed(2));
    if (Math.abs(calculatedTotal - cartTotal) > 0.01) {
      logger.error(`Cart total mismatch: expected ₹${calculatedTotal}, got ₹${cartTotal}`, { userId });
      return res.status(400).json({
        success: false,
        error: `Cart total mismatch: expected ₹${calculatedTotal}, got ₹${cartTotal}`,
      });
    }

    // Validate and apply offer code
    const offerCode = await prisma.offerCode.findUnique({ where: { code: code.toUpperCase() } });
    if (!offerCode) {
      logger.error(`Invalid offer code: ${code}`, { userId });
      return res.status(400).json({ success: false, error: `Invalid offer code` });
    }

    if (offerCode.expiryDate && offerCode.expiryDate < new Date()) {
      logger.error(`Expired offer code: ${code}`, { userId });
      return res.status(400).json({ success: false, error: `Offer code has expired` });
    }

    const codeUsed = await prisma.userOfferCode.findFirst({
      where: { userId, offerCodeId: offerCode.id },
    });
    if (codeUsed) {
      logger.error(`Offer code already used: ${code}`, { userId });
      return res.status(400).json({ success: false, error: `This code was already used` });
    }

    const userOrderCount = await prisma.order.count({ where: { userId } });
    if (offerCode.isFirstOrder && userOrderCount > 0) {
      logger.error(`First-order offer code not applicable: ${code}`, { userId });
      return res.status(400).json({ success: false, error: `Offer code is only for first orders` });
    }

    if (offerCode.discount < 0 || offerCode.discount > 100) {
      logger.error(`Invalid discount value: ${offerCode.discount}% for code ${code}`, { userId });
      return res.status(400).json({ success: false, error: `Invalid discount value` });
    }

    // Apply offer code in a transaction
    await prisma.$transaction([
      prisma.userOfferCode.create({
        data: {
          userId,
          offerCodeId: offerCode.id,
        },
      }),
    ]);

    const discountedTotal = Number((calculatedTotal * (1 - offerCode.discount / 100)).toFixed(2));

    logger.info(`Applied offer code for user ${userId}`, {
      code,
      discount: offerCode.discount,
      cartTotal,
      discountedTotal,
    });
    return res.json({
      success: true,
      data: {
        code: offerCode.code,
        discount: offerCode.discount,
        discountedTotal,
      },
    });
  } catch (error) {
    logger.error('Apply offer code error', {
      message: error.message,
      stack: error.stack,
      userId: req.user?.id,
      requestBody: req.body,
    });
    return res.status(500).json({
      success: false,
      error: error instanceof z.ZodError ? error.errors.map((e) => e.message).join(', ') : 'Failed to apply offer code',
    });
  }
};

module.exports = {
  applyOfferCode,
};