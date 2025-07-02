const express = require('express');
const { createOrder, verifyPayment } = require('../controllers/paymentController.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler } = require('../utils/asyncHandler.js');

const router = express.Router();

router.post('/create', authenticate, asyncHandler(createOrder));
router.post('/verify', authenticate, asyncHandler(verifyPayment));

module.exports = router;