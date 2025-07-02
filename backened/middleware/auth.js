const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');
const { asyncHandler } = require('../utils/asyncHandler');
const { logger } = require('../utils/logger');

const authenticate = asyncHandler(async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const token = req.cookies?.jwt;

  if (!token) {
    logger.error(`[${requestId}] No token provided`);
    return res.status(401).json({ success: false, error: 'No token provided', requestId });
  }

  if (!process.env.JWT_SECRET) {
    logger.error(`[${requestId}] JWT secret not configured`);
    return res.status(500).json({ success: false, error: 'JWT secret not configured', requestId });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    logger.error(`[${requestId}] Invalid JWT token`, { message: error.message, stack: error.stack });
    return res.status(401).json({ success: false, error: 'Invalid token', requestId });
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.id },
    select: { id: true, email: true, role: true, name: true },
  });

  if (!user) {
    logger.error(`[${requestId}] User not found for token`, { userId: decoded.id });
    return res.status(401).json({ success: false, error: 'User not found', requestId });
  }

  req.user = {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name || undefined,
  };

  logger.info(`[${requestId}] User authenticated`, { userId: user.id, email: user.email, role: user.role });
  next();
});

const isAdmin = asyncHandler(async (req, res, next) => {
  const requestId = req.headers['x-request-id'] || 'unknown';
  const userId = req.user?.id || 'unknown';

  if (!req.user || req.user.role !== 'admin') {
    logger.error(`[${requestId}] Admin access denied`, { userId, role: req.user?.role });
    return res.status(403).json({
      success: false,
      error: 'Admin access required',
      requestId,
    });
  }

  logger.info(`[${requestId}] Admin access granted`, { userId });
  next();
});

module.exports = {
  authenticate,
  isAdmin,
};