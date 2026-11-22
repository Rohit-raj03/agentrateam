import crypto from "node:crypto";
import UserModel from "../models/user.model.js";
import { escapeRegex } from "../utils/regex.util.js";

/**
 * @desc    Get Admin Dashboard Telemetry & User Stats
 * @route   GET /api/admin/stats
 * @access  Private / Admin
 */
export const getAdminStats = async (req, res) => {
  try {
    // PERF-02: Run independent telemetry count queries concurrently in parallel
    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalAdmins,
      totalMembers,
      totalManagers,
    ] = await Promise.all([
      UserModel.countDocuments(),
      UserModel.countDocuments({ isActive: true }),
      UserModel.countDocuments({ isActive: false }),
      UserModel.countDocuments({ role: "admin" }),
      UserModel.countDocuments({ role: { $in: ["user", "member"] } }),
      UserModel.countDocuments({ role: "manager" }),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalUsers,
        activeUsers,
        inactiveUsers,
        totalAdmins,
        totalMembers,
        totalManagers,
      },
    });
  } catch (error) {
    console.error("getAdminStats error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error fetching admin statistics",
    });
  }
};

/**
 * @desc    Get all users for Admin management (with search & filter)
 * @route   GET /api/admin/users
 * @access  Private / Admin
 */
export const getAllAdminUsers = async (req, res) => {
  try {
    const { search, role, status, page, limit } = req.query || {};
    const query = {};

    if (search && search.trim()) {
      const s = escapeRegex(search.trim());
      query.$or = [
        { name: { $regex: s, $options: "i" } },
        { email: { $regex: s, $options: "i" } },
        { username: { $regex: s, $options: "i" } },
      ];
    }

    if (role && role !== "all") {
      query.role = role.toLowerCase();
    }

    if (status && status !== "all") {
      query.isActive = status === "active";
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
        .select("-password")
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
    ]);

    res.status(200).json({
      success: true,
      count: users.length,
      users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("getAllAdminUsers error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error fetching users list",
    });
  }
};

/**
 * @desc    Change a user's role (promote/demote: admin, user, manager, member)
 * @route   PATCH /api/admin/users/:id/role
 * @access  Private / Admin
 */
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    const { id } = req.params;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid role ('admin', 'user', 'manager', or 'member')",
      });
    }

    const normalizedRole = role.toLowerCase().trim();
    const validRoles = ["admin", "user", "member", "manager"];

    if (!validRoles.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Role must be 'admin', 'user', 'manager', or 'member'",
      });
    }

    // Safety: prevent admin from demoting themselves directly to avoid lockout
    if (id === req.user._id.toString() && normalizedRole !== "admin") {
      return res.status(400).json({
        success: false,
        message: "You cannot demote your own admin account.",
      });
    }

    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    user.role = normalizedRole;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User role successfully updated to '${user.role}'`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("updateUserRole error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error updating user role",
    });
  }
};

/**
 * @desc    Activate or Deactivate a user
 * @route   PATCH /api/admin/users/:id/status
 * @access  Private / Admin
 */
export const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot deactivate your own admin account.",
      });
    }

    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // If explicit isActive boolean provided, use it; otherwise toggle current status
    user.isActive = typeof isActive === "boolean" ? isActive : !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User account is now ${user.isActive ? "Active" : "Deactivated"}`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("toggleUserStatus error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error changing user status",
    });
  }
};

/**
 * @desc    Delete a user
 * @route   DELETE /api/admin/users/:id
 * @access  Private / Admin
 */
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    if (id === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own admin account.",
      });
    }

    const user = await UserModel.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.status(200).json({
      success: true,
      message: `User '${user.name}' has been successfully deleted.`,
    });
  } catch (error) {
    console.error("deleteUser error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error deleting user",
    });
  }
};

/**
 * @desc    Admin: Create a new user account directly
 * @route   POST /api/admin/users
 * @access  Private / Admin
 */
export const createAdminUser = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role,
      jobTitle,
      username,
      phone,
      department,
      responsibility,
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required.",
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await UserModel.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    const validRoles = ["admin", "user", "member", "manager"];
    let assignedRole = "user";
    if (role) {
      const normalized = role.toLowerCase().trim();
      if (validRoles.includes(normalized)) {
        assignedRole = normalized;
      }
    }

    // SEC-08: If password is not provided or too short, generate a secure random password
    // Never fall back to predictable static strings like 'AgentraTeam@1234'
    const isGeneratedPassword =
      !password || typeof password !== "string" || password.trim().length < 6;
    const finalPassword = isGeneratedPassword
      ? `${crypto.randomBytes(12).toString("hex")}A1!`
      : password.trim();

    const newUser = await UserModel.create({
      name: name.trim(),
      email: cleanEmail,
      username: username?.trim() || cleanEmail.split("@")[0],
      password: finalPassword,
      role: assignedRole,
      jobTitle: jobTitle?.trim() || (assignedRole === "admin" ? "Administrator" : "Team Member"),
      department: department?.trim() || "",
      responsibility: responsibility?.trim() || "",
      phone: phone || "",
      isActive: true,
    });

    return res.status(201).json({
      success: true,
      message: "User created successfully",
      user: {
        id: newUser._id,
        _id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        jobTitle: newUser.jobTitle,
        department: newUser.department,
        responsibility: newUser.responsibility,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt,
        ...(isGeneratedPassword && { temporaryPassword: finalPassword }),
      },
    });
  } catch (error) {
    console.error("createAdminUser error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Server error creating user",
    });
  }
};

