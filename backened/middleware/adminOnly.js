const { asyncHandler } = require('../utils/asyncHandler');
const { logger } = require('../utils/logger');

const adminOnly = asyncHandler(async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const userId = req.user?.id || 'unknown';

  if (!req.user || req.user.role !== 'admin') {
    logger.error(`[${requestId}] Admin access denied`, { userId, role: req.user?.role });
    return res.status(403).json({
      success: false,
      error: 'Access denied. Admin role required.',
      requestId,
    });
  }

  logger.info(`[${requestId}] Admin access granted`, { userId });
  next();
});

module.exports = {
  adminOnly,
};