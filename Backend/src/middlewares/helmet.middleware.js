/**
 * Helmet-equivalent security headers middleware.
 * Sets standard HTTP security headers to protect against common web vulnerabilities.
 */
export const helmet = (options = {}) => (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", options.frameguard?.action || "SAMEORIGIN");
  res.setHeader("Strict-Transport-Security", "max-age=15552000; includeSubDomains");
  res.setHeader("X-DNS-Prefetch-Control", "off");
  res.setHeader("X-Download-Options", "noopen");
  res.setHeader("X-Permitted-Cross-Domain-Policies", "none");
  res.setHeader("X-XSS-Protection", "0");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Origin-Agent-Cluster", "?1");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data: https: blob:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests"
  );
  next();
};

export default helmet;
