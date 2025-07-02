const { z } = require('zod');
const { logger } = require('./logger');

// Custom error classes
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400);
  }
}

class AuthenticationError extends AppError {
  constructor(message) {
    super(message, 401);
  }
}

class AccountLockoutError extends AppError {
  constructor(message) {
    super(message, 423);
  }
}

class ForbiddenError extends AppError {
  constructor(message) {
    super(message, 403);
  }
}

class NotFoundError extends AppError {
  constructor(message) {
    super(message, 404);
  }
}

// Error handler function
const handleAuthError = (error, requestId) => {
  if (error instanceof z.ZodError) {
    return new ValidationError(error.errors.map((e) => e.message).join(', '));
  }

  if (
    error instanceof AuthenticationError ||
    error instanceof AccountLockoutError ||
    error instanceof ValidationError
  ) {
    return error;
  }

  logger.error(`[${requestId}] Unhandled auth error:`, {
    message: error.message,
    stack: error.stack,
  });

  return new AppError('An unexpected error occurred', 500);
};

// Express error-handling middleware
const errorMiddleware = (err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: err.message,
      requestId: req.headers['x-request-id'],
    });
  }

  console.error('Unexpected error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  res.status(500).json({
    success: false,
    error: 'Internal Server Error',
    requestId: req.headers['x-request-id'],
  });
};

// Export all
module.exports = {
  AppError,
  ValidationError,
  AuthenticationError,
  AccountLockoutError,
  ForbiddenError,
  NotFoundError,
  handleAuthError,
  errorMiddleware,
};
