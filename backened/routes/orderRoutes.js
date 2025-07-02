const express = require('express');
const { confirmOrder, getOrderTracking, getAllOrders } = require('../controllers/orderController.js');
const { authenticate, isAdmin } = require('../middleware/auth.js');
const { asyncHandler } = require('../utils/asyncHandler.js');

const router = express.Router();

router.post('/confirm', authenticate, asyncHandler(confirmOrder));
router.get('/track/:orderId', authenticate, asyncHandler(getOrderTracking));
router.get('/', authenticate, isAdmin, asyncHandler(getAllOrders));

module.exports = router;