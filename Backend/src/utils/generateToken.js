import jwt from 'jsonwebtoken';
import config from '../config/config.js';

/**
 * Generate Access Token
 * @param {string|object} user - User object or MongoDB _id
 * @param {string} [role] - User role
 * @returns {string} Signed JWT Access Token
 */
export const generateAccessToken = (user, role = "member") => {
  const userId =
    typeof user === "object" && user?._id
      ? user._id.toString()
      : user?.toString?.() || user;
  const userRole = typeof user === "object" && user?.role ? user.role : role;
  const userEmail = typeof user === "object" && user?.email ? user.email : undefined;

  const secret = config?.ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("JWT ACCESS_TOKEN_SECRET is not configured");
  }

  const tokenVersion =
    typeof user === "object" && user?.tokenVersion !== undefined
      ? user.tokenVersion
      : 0;

  const payload = {
    userId,
    id: userId,
    role: userRole,
    tokenVersion,
    ...(userEmail && { email: userEmail }),
  };

  return jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn: config?.ACCESS_TOKEN_EXPIRES_IN || process.env.ACCESS_TOKEN_EXPIRES_IN || "15m",
  });
};

/**
 * Generate Refresh Token
 * @param {string|object} user - User object or MongoDB _id
 * @param {string} [role] - User role
 * @returns {string} Signed JWT Refresh Token
 */
export const generateRefreshToken = (user, role = "member") => {
  const userId =
    typeof user === "object" && user?._id
      ? user._id.toString()
      : user?.toString?.() || user;
  const userRole = typeof user === "object" && user?.role ? user.role : role;

  const secret = config?.REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    throw new Error("JWT REFRESH_TOKEN_SECRET is not configured");
  }

  return jwt.sign(
    {
      userId,
      id: userId,
      role: userRole,
    },
    secret,
    {
      algorithm: "HS256",
      expiresIn: config?.REFRESH_TOKEN_EXPIRES_IN || process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
    }
  );
};

/**
 * Generate both Access and Refresh Tokens
 * @param {string|object} user - User object or user ID
 * @param {string} [role] - User role
 * @returns {{ accessToken: string, refreshToken: string }}
 */
export const generateAccessAndRefreshTokens = (user, role = "member") => {
  const accessToken = generateAccessToken(user, role);
  const refreshToken = generateRefreshToken(user, role);

  return { accessToken, refreshToken };
};

// Alias for convenience
export const generateTokens = generateAccessAndRefreshTokens;

/**
 * Backward compatibility helper for generateToken
 * Defaults to generating access token
 */
export const generateToken = generateAccessToken;

/**
 * Standard HTTP-only cookie configuration for Refresh Tokens
 */
export const getRefreshTokenCookieOptions = () => {
  const isProduction =
    config?.NODE_ENV === "production" || process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: "/",
  };
};

/**
 * Cookie options for clearing refresh tokens (omits maxAge to satisfy Express v5 standards)
 */
export const getRefreshTokenClearCookieOptions = () => {
  const isProduction =
    config?.NODE_ENV === "production" || process.env.NODE_ENV === "production";

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
  };
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token) => {
  const secret = config?.ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;
  if (!secret) {
    throw new Error("JWT ACCESS_TOKEN_SECRET is not configured");
  }
  return jwt.verify(token, secret, { algorithms: ["HS256"] });
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token) => {
  const secret = config?.REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET;
  if (!secret) {
    throw new Error("JWT REFRESH_TOKEN_SECRET is not configured");
  }
  return jwt.verify(token, secret, { algorithms: ["HS256"] });
};

export default {
  generateAccessToken,
  generateRefreshToken,
  generateAccessAndRefreshTokens,
  generateTokens,
  generateToken,
  getRefreshTokenCookieOptions,
  verifyAccessToken,
  verifyRefreshToken,
};

