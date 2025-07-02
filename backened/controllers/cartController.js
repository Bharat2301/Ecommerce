const prisma = require('../prisma/client');
const { z } = require('zod');
const { logger } = require('../utils/logger');

const cartItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  price: z.number().positive('Price must be positive'),
  size: z.string().optional(),
  name: z.string().optional(),
  image: z.string().optional(),
});

const syncCartSchema = z.object({
  cartItems: z.array(cartItemSchema),
});

// Helper function to delete cart and clear User.cartId
const deleteCart = async (cartId, userId) => {
  await prisma.$transaction([
    prisma.cartItem.deleteMany({ where: { cartId } }),
    prisma.cart.delete({ where: { id: cartId } }),
    prisma.user.update({
      where: { id: userId },
      data: { cartId: null },
    }),
  ]);
};

// Get user's cart
const getCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      logger.error('User not authenticated for getCart', { userId });
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const cart = await prisma.cart.findFirst({
      where: { userId },
      include: { items: { include: { product: true } } },
    });

    if (!cart) {
      return res.json({ success: true, data: { cartItems: [], total: 0 } });
    }

    const cartItems = cart.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      price: item.price,
      size: item.size,
      name: item.product?.name || 'Unknown Product',
      image: item.product?.images?.[0] || 'https://via.placeholder.com/80',
    }));

    const total = Number(cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
    logger.info(`Fetched cart for user ${userId}`, { cartItems, total });
    return res.json({ success: true, data: { cartItems, total } });
  } catch (err) {
    logger.error('Get cart error', {
      message: err.message,
      stack: err.stack,
      userId: req.user?.id,
    });
    return res.status(500).json({ success: false, error: 'Failed to fetch cart' });
  }
};

// Sync client and server cart
const syncCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      logger.error('User not authenticated for syncCart', { userId });
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const { cartItems } = syncCartSchema.parse(req.body);

    // Fetch products in bulk
    const productIds = cartItems.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // Validate client cart items
    const validatedItems = [];
    for (const item of cartItems) {
      const product = productMap.get(item.productId);
      if (!product) {
        logger.error(`Product not found: ${item.productId}`, { userId });
        return res.status(404).json({ success: false, error: `Product ${item.productId} not found` });
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

      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        size: item.size,
        name: product.name,
        image: product.images?.[0] || 'https://via.placeholder.com/80',
      });
    }

    // Get or create server cart
    let cart = await prisma.cart.findFirst({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { cartId: cart.id },
      });
    }

    // Clear existing cart items
    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    // Insert validated items
    await prisma.cartItem.createMany({
      data: validatedItems.map((item) => ({
        cartId: cart.id,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
        size: item.size || null,
      })),
    });

    const total = Number(validatedItems.reduce((sum, item) => sum + item.price * item.quantity, 0).toFixed(2));
    logger.info(`Synced cart for user ${userId}`, { cartItems: validatedItems, total });
    return res.json({ success: true, data: { cartItems: validatedItems, total } });
  } catch (err) {
    logger.error('Sync cart error', {
      message: err.message,
      stack: err.stack,
      userId: req.user?.id,
      requestBody: req.body,
    });
    return res.status(500).json({
      success: false,
      error: err instanceof z.ZodError ? err.errors.map((e) => e.message).join(', ') : 'Failed to sync cart',
    });
  }
};

// Add item to cart
const addToCart = async (req, res) => {
  try {
    const { productId, quantity, price, size } = cartItemSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      logger.error('User not authenticated for addToCart', { userId });
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      logger.error(`Product not found: ${productId}`, { userId });
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    if (Math.abs(product.price - price) > 0.01) {
      logger.error(`Price mismatch for ${product.name}: expected ₹${product.price}, got ₹${price}`, { userId });
      return res.status(400).json({
        success: false,
        error: `Price mismatch for product ${product.name}: expected ₹${product.price}, got ₹${price}`,
      });
    }

    const stockBySize = product.stockBySize || {};
    const selectedSize = size || 'default';
    if (product.sizes?.length && !size) {
      logger.error(`Size required for product: ${product.name}`, { userId });
      return res.status(400).json({ success: false, error: 'Size is required' });
    }
    if (!stockBySize[selectedSize] || stockBySize[selectedSize] < quantity) {
      logger.error(`Insufficient stock for ${product.name} in size ${selectedSize}`, { userId });
      return res.status(400).json({ success: false, error: `Insufficient stock for size ${selectedSize}` });
    }

    let cart = await prisma.cart.findFirst({ where: { userId } });
    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId },
      });
      await prisma.user.update({
        where: { id: userId },
        data: { cartId: cart.id },
      });
    }

    const existingItem = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId, size: size || null },
    });

    if (existingItem) {
      await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: existingItem.quantity + quantity },
      });
    } else {
      await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
          price: product.price,
          size: size || null,
        },
      });
    }

    logger.info(`Added item to cart for user ${userId}`, { productId, quantity, size });
    return res.json({ success: true, message: 'Item added to cart' });
  } catch (err) {
    logger.error('Add to cart error', {
      message: err.message,
      stack: err.stack,
      userId: req.user?.id,
      requestBody: req.body,
    });
    return res.status(500).json({
      success: false,
      error: err instanceof z.ZodError ? err.errors.map((e) => e.message).join(', ') : 'Failed to add item to cart',
    });
  }
};

// Update cart item
const updateCartItem = async (req, res) => {
  try {
    const { productId, quantity, size } = cartItemSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      logger.error('User not authenticated for updateCartItem', { userId });
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const cart = await prisma.cart.findFirst({ where: { userId } });
    if (!cart) {
      logger.error(`Cart not found for user ${userId}`, { userId });
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    const item = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId, size: size || null },
    });
    if (!item) {
      logger.error(`Cart item not found: ${productId}, size: ${size}`, { userId });
      return res.status(404).json({ success: false, error: 'Item not found in cart' });
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      logger.error(`Product not found: ${productId}`, { userId });
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const stockBySize = product.stockBySize || {};
    const selectedSize = size || 'default';
    if (!stockBySize[selectedSize] || stockBySize[selectedSize] < quantity) {
      logger.error(`Insufficient stock for ${product.name} in size ${selectedSize}`, { userId });
      return res.status(400).json({ success: false, error: `Insufficient stock for size ${selectedSize}` });
    }

    if (quantity === 0) {
      await prisma.cartItem.delete({ where: { id: item.id } });
    } else {
      await prisma.cartItem.update({
        where: { id: item.id },
        data: { quantity },
      });
    }

    logger.info(`Updated cart item for user ${userId}`, { productId, quantity, size });
    return res.json({ success: true, message: 'Cart item updated' });
  } catch (err) {
    logger.error('Update cart item error', {
      message: err.message,
      stack: err.stack,
      userId: req.user?.id,
      requestBody: req.body,
    });
    return res.status(500).json({
      success: false,
      error: err instanceof z.ZodError ? err.errors.map((e) => e.message).join(', ') : 'Failed to update cart item',
    });
  }
};

// Remove cart item
const removeCartItem = async (req, res) => {
  try {
    const { productId, size } = z
      .object({
        productId: z.string().min(1, 'Product ID is required'),
        size: z.string().optional(),
      })
      .parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      logger.error('User not authenticated for removeCartItem', { userId });
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const cart = await prisma.cart.findFirst({ where: { userId } });
    if (!cart) {
      logger.error(`Cart not found for user ${userId}`, { userId });
      return res.status(404).json({ success: false, error: 'Cart not found' });
    }

    const item = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, productId, size: size || null },
    });
    if (!item) {
      logger.error(`Cart item not found: ${productId}, size: ${size}`, { userId });
      return res.status(404).json({ success: false, error: 'Item not found in cart' });
    }

    await prisma.cartItem.delete({ where: { id: item.id } });
    logger.info(`Removed cart item for user ${userId}`, { productId, size });
    return res.json({ success: true, message: 'Item removed from cart' });
  } catch (err) {
    logger.error('Remove cart item error', {
      message: err.message,
      stack: err.stack,
      userId: req.user?.id,
      requestBody: req.body,
    });
    return res.status(500).json({
      success: false,
      error: err instanceof z.ZodError ? err.errors.map((e) => e.message).join(', ') : 'Failed to remove cart item',
    });
  }
};

// Clear cart
const clearCart = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      logger.error('User not authenticated for clearCart', { userId });
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    const cart = await prisma.cart.findFirst({ where: { userId } });
    if (!cart) {
      logger.info(`No cart found for user ${userId}, returning empty`);
      return res.json({ success: true, message: 'Cart is already empty' });
    }

    await deleteCart(cart.id, userId);
    logger.info(`Cleared cart for user ${userId}`);
    return res.json({ success: true, message: 'Cart cleared' });
  } catch (err) {
    logger.error('Clear cart error', {
      message: err.message,
      stack: err.stack,
      userId: req.user?.id,
    });
    return res.status(500).json({ success: false, error: 'Failed to clear cart' });
  }
};

// Validate cart
const validateCart = async (req, res) => {
  try {
    const { items, offerCode } = z
      .object({
        items: z.array(cartItemSchema),
        offerCode: z.string().optional(),
      })
      .parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      logger.error('User not authenticated for validateCart', { userId });
      return res.status(401).json({ success: false, error: 'User not authenticated' });
    }

    if (!items || items.length === 0) {
      logger.error('Invalid cart items', { items, userId });
      return res.status(400).json({ success: false, error: 'Cart items are required' });
    }

    const productIds = items.map((item) => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));
    let calculatedTotal = 0;
    const validatedItems = [];

    for (const item of items) {
      const product = productMap.get(item.productId);
      if (!product) {
        logger.error(`Product not found: ${item.productId}`, { userId });
        return res.status(404).json({ success: false, error: `Product ${item.productId} not found` });
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
        logger.error(`Size selection required for ${product.name}`, { userId });
        return res.status(400).json({ success: false, error: `Size selection required for ${product.name}` });
      }
      if (!stockBySize[size] || stockBySize[size] < item.quantity) {
        logger.error(`Insufficient stock for ${product.name} in size ${size}`, { userId });
        return res.status(400).json({ success: false, error: `Insufficient stock for ${product.name} in size ${size}` });
      }

      calculatedTotal += product.price * item.quantity;
      validatedItems.push({
        productId: item.productId,
        quantity: item.quantity,
        price: product.price,
        size: item.size,
        name: product.name,
        image: product.images?.[0] || 'https://via.placeholder.com/80',
      });
    }

    calculatedTotal = Number(calculatedTotal.toFixed(2));
    let discount = 0;
    let discountedTotal = calculatedTotal;

    if (offerCode) {
      const offer = await prisma.offerCode.findUnique({ where: { code: offerCode.toUpperCase() } });
      if (!offer) {
        logger.error(`Invalid offer code: ${offerCode}`, { userId });
        return res.status(400).json({ success: false, error: `Invalid offer code` });
      }
      if (offer.expiryDate && offer.expiryDate < new Date()) {
        logger.error(`Expired offer code: ${offerCode}`, { userId });
        return res.status(400).json({ success: false, error: `Offer code has expired` });
      }
      const userOffer = await prisma.userOfferCode.findFirst({
        where: { userId, offerCodeId: offer.id },
      });
      if (userOffer) {
        logger.error(`Offer code already used: ${offerCode}`, { userId });
        return res.status(400).json({ success: false, error: `This code was already used` });
      }
      if (offer.isFirstOrder) {
        const orderCount = await prisma.order.count({ where: { userId } });
        if (orderCount > 0) {
          logger.error(`First-order offer code not applicable: ${offerCode}`, { userId });
          return res.status(400).json({ success: false, error: `Offer code is only for first orders` });
        }
      }
      discount = offer.discount;
      discountedTotal = Number((calculatedTotal * (1 - discount / 100)).toFixed(2));
    }

    logger.info('Cart validated successfully', {
      userId,
      items: validatedItems,
      calculatedTotal,
      discount,
      discountedTotal,
      offerCode,
    });
    return res.json({ success: true, data: { valid: true, total: discountedTotal, items: validatedItems, discount } });
  } catch (err) {
    logger.error('Validate cart error', {
      message: err.message,
      stack: err.stack,
      userId: req.user?.id,
      requestBody: req.body,
    });
    return res.status(500).json({
      success: false,
      error: err instanceof z.ZodError ? err.errors.map((e) => e.message).join(', ') : 'Failed to validate cart',
    });
  }
};

module.exports = {
  getCart,
  syncCart,
  addToCart,
  updateCartItem,
  removeCartItem,
  clearCart,
  validateCart,
};