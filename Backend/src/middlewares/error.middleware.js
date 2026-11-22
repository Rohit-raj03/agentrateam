/**
 * 404 Not Found Middleware
 */
export const notFoundHandler = (req, res, next) => {
  const error = new Error(`Resource Not Found - ${req.originalUrl}`);
  res.status(404);
  next(error);
};

/**
 * Centralized Global Error Handler Middleware
 */
export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  const isProduction =
    process.env.NODE_ENV === "production" ||
    (typeof process.env.NODE_ENV === "undefined" && !process.argv.includes("--test"));

  // Sanitize 500 error messages in production to avoid leaking database errors, stack traces, or internal paths
  const message =
    statusCode >= 500 && isProduction
      ? "Internal Server Error"
      : err.message || "Internal Server Error";

  res.status(statusCode).json({
    success: false,
    message,
    stack: isProduction ? null : err.stack,
  });
};

