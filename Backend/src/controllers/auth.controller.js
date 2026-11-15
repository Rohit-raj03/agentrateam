import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import UserModel from "../models/user.model.js";
import config from "../config/config.js";
import { getRefreshTokenCookieOptions } from "../utils/generateToken.js";
import authService from "../services/auth.service.js";

/**
 * Format standard authenticated user payload matching frontend expectations
 */
const formatAuthResponse = (user, accessToken, refreshToken) => ({
  success: true,
  token: accessToken,
  accessToken,
  refreshToken,
  user: {
    id: user._id,
    _id: user._id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    jobTitle: user.jobTitle,
    avatar: user.avatar,
    phone: user.phone,
    bio: user.bio,
    location: user.location,
    timezone: user.timezone,
    twoFactorEnabled: user.twoFactorEnabled,
    isEmailVerified: user.isEmailVerified,
  },
});

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const registerUser = async (req, res) => {
  try {
    const { user, accessToken, refreshToken } = await authService.register(
      req.body
    );

    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());
    return res
      .status(201)
      .json(formatAuthResponse(user, accessToken, refreshToken));
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error during registration",
    });
  }
};

/**
 * @desc    Login existing user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const loginUser = async (req, res) => {
  try {
    const { user, accessToken, refreshToken } = await authService.login(
      req.body
    );

    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());
    return res
      .status(200)
      .json(formatAuthResponse(user, accessToken, refreshToken));
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error during login",
    });
  }
};

/**
 * @desc    Authenticate with Google ID Token (OAuth 2.0)
 * @route   POST /api/auth/google
 * @access  Public
 */
export const googleAuthUser = async (req, res) => {
  try {
    const credential = req.body?.credential || req.body?.idToken || req.body?.token;
    if (!credential) {
      return res.status(400).json({
        success: false,
        message: "Google credential token is required",
      });
    }

    const { user, accessToken, refreshToken, isNewUser } =
      await authService.loginWithGoogle(credential);

    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

    const responseData = formatAuthResponse(user, accessToken, refreshToken);
    responseData.isNewUser = isNewUser;

    return res.status(isNewUser ? 201 : 200).json(responseData);
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Google authentication failed",
    });
  }
};

/**
 * @desc    Refresh Access Token
 * @route   POST /api/auth/refresh-token or /api/auth/refresh
 * @access  Public
 */
export const refreshAccessToken = async (req, res) => {
  try {
    const incomingRefreshToken =
      req.cookies?.refreshToken ||
      req.body?.refreshToken ||
      req.headers["x-refresh-token"];

    const { user, accessToken, refreshToken } = await authService.refreshSession(
      incomingRefreshToken
    );

    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());
    return res
      .status(200)
      .json(formatAuthResponse(user, accessToken, refreshToken));
  } catch (error) {
    return res.status(error.statusCode || 401).json({
      success: false,
      message: error.message || "Invalid or expired refresh token",
    });
  }
};

/**
 * @desc    Logout user & clear cookie
 * @route   POST /api/auth/logout
 * @access  Public / Private
 */
export const logoutUser = async (req, res) => {
  try {
    let userId = req.user?._id;

    // 1. If req.user is absent, attempt resolving userId from Authorization header
    if (!userId && req.headers?.authorization?.startsWith("Bearer ")) {
      try {
        const token = req.headers.authorization.split(" ")[1];
        const secret = config.ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET;
        if (secret) {
          const decoded = jwt.verify(token, secret);
          userId = decoded.userId || decoded.id;
        }
      } catch (err) {
        // Access token might be expired; proceed to check refresh token
      }
    }

    // 2. Fall back to resolving userId from refresh token cookie or request body
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    if (!userId && refreshToken) {
      try {
        const secret = config.REFRESH_TOKEN_SECRET || process.env.REFRESH_TOKEN_SECRET;
        if (secret) {
          const decoded = jwt.verify(refreshToken, secret);
          userId = decoded.userId || decoded.id;
        }
      } catch (err) {
        // Refresh token may be expired/malformed
      }
    }

    // 3. Invalidate refresh token in MongoDB
    if (userId) {
      await authService.logout(userId);
    } else if (refreshToken) {
      await UserModel.findOneAndUpdate(
        { refreshToken },
        { refreshToken: "" }
      );
    }

    // 4. Clear client-side cookie
    res.clearCookie("refreshToken", getRefreshTokenCookieOptions());
    return res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (error) {
    console.error("logoutUser error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Server error during logout",
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).select(
      "-password -refreshToken"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error fetching user profile",
    });
  }
};

/**
 * @desc    Forgot Password - Request reset link
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
const RESET_SUCCESS_MESSAGE =
  "If that email exists in our system, we've sent a password reset link.";

export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body ?? {};

    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({
        success: false,
        message: "Please enter your email address",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await UserModel.findOne({ email: cleanEmail });

    if (!user) {
      return res.status(200).json({
        success: true,
        message: RESET_SUCCESS_MESSAGE,
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordToken = hashedToken;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save({ validateBeforeSave: false });

    const clientUrl = config.CLIENT_URL || "http://localhost:5173";
    const resetUrl = `${clientUrl.replace(/\/$/, "")}/reset-password?token=${resetToken}`;

    // SEC-11: Never leak reset token unless explicitly in local development/test mode
    const isDevelopmentOrTest =
      config.NODE_ENV === "development" || config.NODE_ENV === "test";

    return res.status(200).json({
      success: true,
      message: RESET_SUCCESS_MESSAGE,
      ...(isDevelopmentOrTest && { resetUrl, resetToken }),
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error processing password reset request",
    });
  }
};

/**
 * @desc    Reset Password using token
 * @route   POST /api/auth/reset-password
 * @access  Public
 */
export const resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Reset token and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await UserModel.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Password reset link is invalid or has expired",
      });
    }

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password has been successfully reset. You can now log in.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error resetting password",
    });
  }
};

export default {
  registerUser,
  loginUser,
  googleAuthUser,
  refreshAccessToken,
  logoutUser,
  getMe,
  forgotPassword,
  resetPassword,
};
