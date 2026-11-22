import express from "express";
import {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getAllUsers,
  getUserById,
} from "../controllers/user.controller.js";
import {
  updateProfileAvatar,
  deleteProfileAvatar,
} from "../controllers/media.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { uploadSingleImage } from "../middlewares/upload.middleware.js";
import {
  authRateLimiter,
  uploadRateLimiter,
} from "../middlewares/rateLimit.middleware.js";

const router = express.Router();

// Protected user routes
router.use(protect);

router.get("/profile", getUserProfile);
router.put("/profile", uploadRateLimiter, uploadSingleImage("image", false), updateUserProfile);
router.put("/change-password", authRateLimiter, changePassword);

// Avatar management endpoints
router.patch("/profile/image", uploadRateLimiter, uploadSingleImage("image"), updateProfileAvatar);
router.delete("/profile/image", deleteProfileAvatar);
router.get("/", getAllUsers);
router.get("/:id", getUserById);

export default router;


