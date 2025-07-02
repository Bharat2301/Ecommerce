const { AppError } = require('./errorHandler');

const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch((err) => {
      if (!(err instanceof AppError)) {
        err = new AppError(err.message || 'Internal Server Error', 500);
      }
      next(err);
    });
  };
};

module.exports = { asyncHandler };
