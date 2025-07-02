const express = require('express');
const {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  getProductById,
} = require('../controllers/productController');
const { authenticate, isAdmin } = require('../middleware/auth');
const { asyncHandler } = require('../utils/asyncHandler');
const rateLimit = require('express-rate-limit');
const prisma = require('../prisma/client'); // Import Prisma client

const router = express.Router();

const adminOperationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Limit to 50 requests per window per IP
  message: {
    success: false,
    error: 'Too many requests. Please try again later.',
  },
});

router.get('/', asyncHandler(getProducts));
router.get('/categories', async (req, res) => {
  try {
    const categories = await prisma.product.findMany({
      distinct: ['category'],
      select: { category: true },
    });
    const categoryList = categories.map((item) => item.category);
    res.json({ success: true, data: categoryList });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch categories' });
  }
});
router.get('/:id', asyncHandler(getProductById));
router.post('/', authenticate, isAdmin, adminOperationLimiter, asyncHandler(createProduct));
router.put('/:id', authenticate, isAdmin, adminOperationLimiter, asyncHandler(updateProduct));
router.delete('/:id', authenticate, isAdmin, adminOperationLimiter, asyncHandler(deleteProduct));

module.exports = router;