import mongoose from "mongoose";
import UserModel from "../models/user.model.js";
import { escapeRegex } from "../utils/regex.util.js";
import {
  uploadImage,
  safeCleanupFile,
  MEDIA_FOLDERS,
} from "../services/imagekit.service.js";

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getUserProfile = async (req, res) => {
  try {
    const user = await UserModel.findById(req.user._id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("getUserProfile error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error fetching user profile",
    });
  }
};

/**
 * @desc    Update current user profile (Supports both JSON & multipart image upload)
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateUserProfile = async (req, res) => {
  let uploadedMedia = null;

  try {
    const user = await UserModel.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const {
      name,
      username,
      phone,
      bio,
      jobTitle,
      jobDescription,
      department,
      responsibility,
      location,
      timezone,
      avatar,
      twoFactorEnabled,
    } = req.body;

    if (name) user.name = name.trim();
    if (username !== undefined) {
      const cleanUsername = username.trim().toLowerCase();
      if (cleanUsername && cleanUsername !== user.username) {
        const existingUsername = await UserModel.findOne({
          username: cleanUsername,
          _id: { $ne: user._id },
        });
        if (existingUsername) {
          return res.status(409).json({
            success: false,
            message: "Username is already taken by another team member",
          });
        }
        user.username = cleanUsername;
      }
    }
    if (phone !== undefined) user.phone = phone.trim();
    if (bio !== undefined) user.bio = bio.trim();
    if (jobTitle !== undefined) user.jobTitle = jobTitle.trim();
    if (jobDescription !== undefined) user.jobDescription = jobDescription.trim();
    if (department !== undefined) user.department = department.trim();
    if (responsibility !== undefined) user.responsibility = responsibility.trim();
    if (location !== undefined) user.location = location.trim();
    if (timezone !== undefined) user.timezone = timezone.trim();
    if (twoFactorEnabled !== undefined) {
      user.twoFactorEnabled =
        typeof twoFactorEnabled === "string"
          ? twoFactorEnabled === "true"
          : Boolean(twoFactorEnabled);
    }

    const oldFileId = user.avatarFileId;

    // Handle image file if uploaded in multipart/form-data
    if (req.file) {
      uploadedMedia = await uploadImage({
        buffer: req.file.buffer,
        originalName: req.file.originalname,
        mimeType: req.file.verifiedMimeType || req.file.mimetype,
        folder: MEDIA_FOLDERS.PROFILES,
        tags: ["avatar", "user", user._id.toString()],
      });

      user.avatar = uploadedMedia.url;
      user.avatarFileId = uploadedMedia.fileId;
    } else if (avatar !== undefined) {
      user.avatar = avatar;
    }

    const updatedUser = await user.save();

    // Clean up replaced old file if a new file was uploaded
    if (uploadedMedia?.fileId && oldFileId && oldFileId !== uploadedMedia.fileId) {
      safeCleanupFile(oldFileId);
    }

    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        role: updatedUser.role,
        department: updatedUser.department,
        responsibility: updatedUser.responsibility,
        jobTitle: updatedUser.jobTitle,
        jobDescription: updatedUser.jobDescription,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
        location: updatedUser.location,
        timezone: updatedUser.timezone,
        avatar: updatedUser.avatar,
        avatarFileId: updatedUser.avatarFileId,
        twoFactorEnabled: updatedUser.twoFactorEnabled,
      },
    });
  } catch (error) {
    if (uploadedMedia?.fileId) {
      await safeCleanupFile(uploadedMedia.fileId);
    }

    console.error("updateUserProfile error:", error.message);
    res.status(500).json({
      success: false,
      message: error.message || "Server error updating user profile",
    });
  }
};


/**
 * @desc    Get all active users (for team directory & task assignees)
 * @route   GET /api/users
 * @access  Private
 */
export const getAllUsers = async (req, res) => {
  try {
    const { search, page, limit } = req.query || {};
    const query = { isActive: true };

    if (search && search.trim()) {
      const s = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: s, $options: "i" } },
        { email: { $regex: s, $options: "i" } },
        { username: { $regex: s, $options: "i" } },
      ];
    }

    // PERF-03: Paginate list query with sensible boundaries
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum =
      req.query.limit !== undefined || req.query.page !== undefined
        ? Math.min(100, Math.max(1, parseInt(limit) || 20))
        : 100;

    const [total, users] = await Promise.all([
      UserModel.countDocuments(query),
      UserModel.find(query)
        .select("name username email avatar jobTitle department")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      users,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("getAllUsers error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error fetching users",
    });
  }
};

/**
 * @desc    Get single user by ID
 * @route   GET /api/users/:id
 * @access  Private
 */
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID format",
      });
    }

    const user = await UserModel.findById(id).select(
      "name username email avatar jobTitle department"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("getUserById error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error fetching user",
    });
  }
};

/**
 * @desc    Change logged-in user password
 * @route   PUT /api/users/change-password
 * @access  Private
 */
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long",
      });
    }

    const user = await UserModel.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password does not match",
      });
    }

    user.password = newPassword;
    user.tokenVersion = (user.tokenVersion || 0) + 1;
    user.refreshToken = "";
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("changePassword error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error changing password",
    });
  }
};

