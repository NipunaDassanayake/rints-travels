class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404);
  }
}

class BadRequestError extends AppError {
  constructor(message = "Bad request", errors = null) {
    super(message, 400, errors);
  }
}

module.exports = {
  AppError,
  NotFoundError,
  BadRequestError,
};