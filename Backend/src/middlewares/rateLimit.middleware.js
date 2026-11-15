/**
 * In-memory sliding-window rate limiting middleware (Zero external dependencies).
 * Protects critical endpoints (auth, password reset) against brute-force and credential stuffing.
 */

/**
 * Creates an Express rate limiter middleware.
 * @param {Object} options
 * @param {number} [options.windowMs=900000] - Window size in milliseconds (default 15 minutes)
 * @param {number} [options.max=10] - Max requests allowed per window per IP
 * @param {string} [options.message] - Custom error message on rate limit exceed
 * @returns {import('express').RequestHandler}
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 15,
  message = "Too many requests. Please try again later.",
} = {}) => {
  const store = new Map(); // ip -> { count, resetTime }

  // Periodic pruning of expired entries to prevent memory growth
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of store.entries()) {
      if (now >= record.resetTime) {
        store.delete(ip);
      }
    }
  }, Math.min(windowMs, 60000));

  // Allow Node to exit cleanly without waiting on interval
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return (req, res, next) => {
    // Bypass in test environment if configured
    if (process.env.DISABLE_RATE_LIMITING === "true") {
      return next();
    }

    const ip =
      req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      "127.0.0.1";

    const now = Date.now();
    const record = store.get(ip);

    if (!record || now >= record.resetTime) {
      store.set(ip, { count: 1, resetTime: now + windowMs });
      res.setHeader("X-RateLimit-Limit", max);
      res.setHeader("X-RateLimit-Remaining", max - 1);
      return next();
    }

    record.count += 1;
    const remaining = Math.max(0, max - record.count);
    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", remaining);

    if (record.count > max) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfterSeconds);
      return res.status(429).json({
        success: false,
        message,
        retryAfter: retryAfterSeconds,
      });
    }

    return next();
  };
};

// Standard limiter for authentication endpoints: 20 requests per 15 minutes
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many authentication attempts from this IP. Please try again after 15 minutes.",
});

export default {
  createRateLimiter,
  authRateLimiter,
};
