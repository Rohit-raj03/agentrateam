import express from "express";
import {
  registerUser,
  loginUser,
  googleAuthUser,
  refreshAccessToken,
  logoutUser,
  getMe,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { authRateLimiter } from "../middlewares/rateLimit.middleware.js";

const router = express.Router();

// Public Authentication Routes (SEC-10: Rate limited against brute-force attacks)
router.post("/register", authRateLimiter, registerUser);
router.post("/login", authRateLimiter, loginUser);
router.post("/google", authRateLimiter, googleAuthUser);
router.post("/refresh-token", refreshAccessToken);
router.post("/refresh", refreshAccessToken); // Alias
router.post("/logout", logoutUser);
router.post("/forgot-password", authRateLimiter, forgotPassword);
router.post("/reset-password", authRateLimiter, resetPassword);

// Protected Authentication Routes
router.get("/me", protect, getMe);

export default router;
