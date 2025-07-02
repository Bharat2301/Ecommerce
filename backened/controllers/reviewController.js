const prisma = require('../prisma/client');
const { z } = require('zod');
const { ValidationError } = require('../utils/errorHandler');
const { logger } = require('../utils/logger');

const reviewSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  rating: z.number().int().min(1, 'Rating must be at least 1').max(5, 'Rating cannot exceed 5'),
  comment: z.string().min(1, 'Comment is required'),
});

const submitReview = async (req, res) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  try {
    const { productId, rating, comment } = reviewSchema.parse(req.body);
    const userId = req.user?.id;

    if (!userId) {
      throw new ValidationError('User not authenticated');
    }

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new ValidationError('Product not found');
    }

    const review = await prisma.review.create({
      data: {
        productId,
        userId,
        rating,
        comment,
      },
    });

    logger.info(`[${requestId}] Review submitted for product ${productId}`, { userId, rating });
    return res.status(201).json({ success: true, data: review, requestId });
  } catch (error) {
    logger.error(`[${requestId}] Submit review error`, {
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

const getReviews = async (req, res) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const { productId } = req.params;

  try {
    if (!productId) {
      throw new ValidationError('Product ID is required');
    }

    const reviews = await prisma.review.findMany({
      where: { productId },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    logger.info(`[${requestId}] Fetched ${reviews.length} reviews for product ${productId}`);
    return res.status(200).json({ success: true, data: reviews, requestId });
  } catch (error) {
    logger.error(`[${requestId}] Get reviews error`, {
      message: error.message,
      stack: error.stack,
      productId,
    });
    throw error;
  }
};

module.exports = {
  submitReview,
  getReviews,
};