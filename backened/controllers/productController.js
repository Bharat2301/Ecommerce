const prisma = require('../prisma/client');
const { z } = require('zod');
const { ValidationError, ForbiddenError, NotFoundError, AppError } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');

// Simple ObjectId validation (24 hex chars) or adjust as per your ID format
function isValidObjectId(id) {
  return /^[a-f\d]{24}$/i.test(id);
}

// Schema for creating a product
const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  price: z.number().positive('Price must be positive'),
  mrp: z.number().positive('MRP must be positive').optional().nullable(),
  images: z.array(z.string().url()).min(1, 'At least one image URL is required'),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  quantity: z.number().int().nonnegative('Quantity must be non-negative'),
  description: z.string().default(''),
  stockBySize: z.record(z.number().int().nonnegative()).optional(),
});

// Schema for updating a product
const updateProductSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  category: z.string().min(1, 'Category cannot be empty').optional(),
  price: z.number().positive('Price must be positive').optional(),
  mrp: z.number().positive('MRP must be positive').optional().nullable(),
  images: z.array(z.string().url()).min(1, 'At least one image URL is required').optional(),
  colors: z.array(z.string()).optional(),
  sizes: z.array(z.string()).optional(),
  quantity: z.number().int().nonnegative('Quantity must be non-negative').optional(),
  description: z.string().optional(),
  stockBySize: z.record(z.number().int().nonnegative()).optional(),
});

// Fetch all products with optional category filter
const getProducts = async (req, res) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const { category } = req.query;

  try {
    const products = await prisma.product.findMany({
      where: category ? { category: String(category) } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        mrp: true,
        images: true,
        category: true,
        colors: true,
        sizes: true,
        quantity: true,
        stockBySize: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    logger.info(`[${requestId}] Fetched ${products.length} products`, { category });
    return res.status(200).json({ success: true, data: products, requestId });
  } catch (error) {
    logger.error(`[${requestId}] Get products error`, {
      message: error.message,
      stack: error.stack,
      category,
    });
    throw new AppError('Failed to fetch products', 500);
  }
};

// Fetch a product by ID
const getProductById = async (req, res) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const { id } = req.params;

  try {
    if (!id) {
      throw new ValidationError('Product ID is required');
    }

    if (!isValidObjectId(id)) {
      throw new ValidationError('Invalid Product ID format');
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        mrp: true,
        images: true,
        category: true,
        colors: true,
        sizes: true,
        quantity: true,
        stockBySize: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    logger.info(`[${requestId}] Fetched product ${id}`);
    return res.status(200).json({ success: true, data: product, requestId });
  } catch (error) {
    logger.error(`[${requestId}] Get product by ID error`, {
      message: error.message,
      stack: error.stack,
      productId: id,
    });
    throw error;
  }
};

// Create a new product
const createProduct = async (req, res) => {
  const requestId = req.headers['x-request-id'] || 'unknown';

  try {
    if (!req.user || req.user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    const data = createProductSchema.parse(req.body);

    if (data.sizes && data.sizes.length > 0 && data.stockBySize) {
      const totalStock = Object.values(data.stockBySize).reduce((sum, val) => sum + val, 0);
      if (totalStock !== data.quantity) {
        throw new ValidationError('Total stockBySize must equal quantity');
      }
    }

    const newProduct = await prisma.product.create({
      data: {
        ...data,
        colors: data.colors || ['#000000', '#FF0000', '#00FF00'],
        sizes: data.sizes || ['S', 'M', 'L', 'XL'],
        stockBySize: data.stockBySize || {},
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        mrp: true,
        images: true,
        category: true,
        colors: true,
        sizes: true,
        quantity: true,
        stockBySize: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info(`[${requestId}] Created product ${newProduct.id}`, { name: data.name });
    return res.status(201).json({ success: true, data: newProduct, requestId });
  } catch (error) {
    logger.error(`[${requestId}] Create product error`, {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
    });
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors.map((e) => e.message).join(', '));
    }
    throw error;
  }
};

// Update an existing product
const updateProduct = async (req, res) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const { id } = req.params;

  try {
    if (!req.user || req.user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    if (!id) {
      throw new ValidationError('Product ID is required');
    }

    if (!isValidObjectId(id)) {
      throw new ValidationError('Invalid Product ID format');
    }

    const data = updateProductSchema.parse(req.body);

    if (data.sizes && data.quantity && data.stockBySize) {
      const totalStock = Object.values(data.stockBySize).reduce((sum, val) => sum + val, 0);
      if (totalStock !== data.quantity) {
        throw new ValidationError('Total stockBySize must equal quantity');
      }
    }

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...data,
        stockBySize: data.stockBySize || undefined,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        mrp: true,
        images: true,
        category: true,
        colors: true,
        sizes: true,
        quantity: true,
        stockBySize: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    logger.info(`[${requestId}] Updated product ${id}`, { name: data.name });
    return res.status(200).json({ success: true, data: product, requestId });
  } catch (error) {
    logger.error(`[${requestId}] Update product error`, {
      message: error.message,
      stack: error.stack,
      productId: id,
      requestBody: req.body,
    });
    if (error instanceof z.ZodError) {
      throw new ValidationError(error.errors.map((e) => e.message).join(', '));
    }
    throw error;
  }
};

// Delete a product
const deleteProduct = async (req, res) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const { id } = req.params;

  try {
    if (!req.user || req.user.role !== 'admin') {
      throw new ForbiddenError('Admin access required');
    }

    if (!id) {
      throw new ValidationError('Product ID is required');
    }

    if (!isValidObjectId(id)) {
      throw new ValidationError('Invalid Product ID format');
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!product) {
      throw new NotFoundError('Product not found');
    }

    await prisma.product.delete({
      where: { id },
    });

    logger.info(`[${requestId}] Deleted product ${id}`);
    return res.status(200).json({ success: true, message: 'Product deleted successfully', requestId });
  } catch (error) {
    logger.error(`[${requestId}] Delete product error`, {
      message: error.message,
      stack: error.stack,
      productId: id,
    });
    throw error;
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
};