const express = require('express');
const { getCart, addToCart, updateCartItem, removeCartItem, clearCart, validateCart, syncCart } = require('../controllers/cartController.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler } = require('../utils/asyncHandler.js');

const router = express.Router();

router.get('/', authenticate, asyncHandler(getCart));
router.post('/sync', authenticate, asyncHandler(syncCart));
router.post('/add', authenticate, asyncHandler(addToCart));
router.put('/update', authenticate, asyncHandler(updateCartItem));
router.delete('/remove', authenticate, asyncHandler(removeCartItem));
router.delete('/clear', authenticate, asyncHandler(clearCart));
router.post('/validate', authenticate, asyncHandler(validateCart));

module.exports = router;