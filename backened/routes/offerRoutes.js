const express = require('express');
const { applyOfferCode } = require('../controllers/offerCode.controller.js');
const { authenticate } = require('../middleware/auth.js');
const { asyncHandler } = require('../utils/asyncHandler.js');

const router = express.Router();

router.post('/apply', authenticate, asyncHandler(applyOfferCode));

module.exports = router;