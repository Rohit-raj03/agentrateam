import mongoose from "mongoose";
import UserModel from "../models/user.model.js";
import Invitation from "../models/invitation.model.js";
import { sendEmail } from "../services/email.service.js";
import { createInvitation } from "../services/invitation.service.js";
import {
  accountApprovedTemplate,
  accountDeactivatedTemplate,
  accountRevokedTemplate,
  roleUpdatedTemplate,
} from "../templates/accountStatus.template.js";
import config from "../config/config.js";
import { escapeRegex } from "../utils/regex.util.js";

const VALID_ADMIN_ROLES = ["admin", "manager", "member"];
const isSelfAccount = (targetId, currentUserId) =>
  Boolean(targetId && currentUserId && targetId === currentUserId.toString());

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
      UserModel.countDocuments({ role: "member" }),
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
      if (status === "pending") {
        query.approvalStatus = "pending";
      } else if (status === "active") {
        query.isActive = true;
        query.approvalStatus = "approved";
      } else if (status === "inactive") {
        query.isActive = false;
        query.approvalStatus = { $ne: "revoked" };
      } else if (status === "revoked") {
        query.approvalStatus = "revoked";
      }
    } else {
      query.approvalStatus = { $ne: "revoked" };
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

    const formattedUsers = users.map((u) => {
      const userObj = u.toObject ? u.toObject() : { ...u };
      if (!userObj.isActive) {
        userObj.status = "inactive";
      } else if (userObj.approvalStatus === "revoked") {
        userObj.status = "revoked";
      } else if (userObj.approvalStatus === "pending") {
        userObj.status = "pending";
      } else {
        userObj.status = "active";
      }
      return userObj;
    });

    res.status(200).json({
      success: true,
      count: formattedUsers.length,
      users: formattedUsers,
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
        message: "Please provide a valid role ('admin', 'manager', or 'member')",
      });
    }

    const normalizedRole = role.toLowerCase().trim();

    if (!VALID_ADMIN_ROLES.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Role must be 'admin', 'manager', or 'member'",
      });
    }

    // Safety: prevent admin from demoting themselves directly to avoid lockout
    if (isSelfAccount(id, req.user?._id) && normalizedRole !== "admin") {
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

    // Trigger role update notification email
    const clientBaseUrl = config.CLIENT_URL;

    await sendEmail({
      to: user.email,
      subject: `Your AgentraTeam role has been updated to ${normalizedRole.toUpperCase()}`,
      html: roleUpdatedTemplate({
        name: user.name,
        role: normalizedRole,
        clientBaseUrl,
      }),
    }).catch((err) =>
      console.error("Role update email delivery error:", err.message)
    );

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
 * @desc    Update a user's details (profile credentials, role permissions, department, responsibility, etc.)
 * @route   PATCH /api/admin/users/:id
 * @access  Private / Admin
 */
export const updateUserDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      username,
      email,
      role,
      department,
      responsibility,
      jobTitle,
      phone,
      location,
    } = req.body;

    const user = await UserModel.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const changes = [];

    // Role check & demotion safety
    if (role !== undefined && role !== null && role !== "") {
      const normalizedRole = role.toLowerCase().trim();

      if (!VALID_ADMIN_ROLES.includes(normalizedRole)) {
        return res.status(400).json({
          success: false,
          message: "Invalid role. Role must be 'admin', 'manager', or 'member'",
        });
      }

      if (isSelfAccount(id, req.user?._id) && normalizedRole !== "admin") {
        return res.status(400).json({
          success: false,
          message: "You cannot demote your own admin account.",
        });
      }

      if (user.role !== normalizedRole) {
        changes.push({
          label: "System Role",
          oldValue: user.role.toUpperCase(),
          newValue: normalizedRole.toUpperCase(),
        });
        user.role = normalizedRole;
      }
    }

    // Name
    if (name !== undefined && name.trim() && user.name !== name.trim()) {
      changes.push({
        label: "Full Name",
        oldValue: user.name || "None",
        newValue: name.trim(),
      });
      user.name = name.trim();
    }

    // Username
    if (username !== undefined && (user.username || "") !== username.trim()) {
      const trimmedUsername = username.trim();
      if (trimmedUsername) {
        const existingUsername = await UserModel.findOne({
          username: trimmedUsername,
          _id: { $ne: user._id },
        });
        if (existingUsername) {
          return res.status(400).json({
            success: false,
            message: "Username is already taken by another account",
          });
        }
      }
      changes.push({
        label: "Username",
        oldValue: user.username || "None",
        newValue: trimmedUsername || "None",
      });
      user.username = trimmedUsername || undefined;
    }

    // Email
    let emailChanged = false;
    const oldEmail = user.email;
    if (email !== undefined && email.trim() && user.email !== email.toLowerCase().trim()) {
      const cleanEmail = email.toLowerCase().trim();
      const existingEmail = await UserModel.findOne({
        email: cleanEmail,
        _id: { $ne: user._id },
      });
      if (existingEmail) {
        return res.status(400).json({
          success: false,
          message: "Email is already registered to another account",
        });
      }
      changes.push({
        label: "Email Address",
        oldValue: user.email,
        newValue: cleanEmail,
      });
      user.email = cleanEmail;
      emailChanged = true;
    }

    // Department
    if (department !== undefined && (user.department || "") !== department.trim()) {
      changes.push({
        label: "Department",
        oldValue: user.department || "None",
        newValue: department.trim() || "None",
      });
      user.department = department.trim();
    }

    // Team & Responsibility
    if (responsibility !== undefined && (user.responsibility || "") !== responsibility.trim()) {
      changes.push({
        label: "Team & Responsibility",
        oldValue: user.responsibility || "None",
        newValue: responsibility.trim() || "None",
      });
      user.responsibility = responsibility.trim();
    }

    // Job Title / Discipline
    if (jobTitle !== undefined && (user.jobTitle || "") !== jobTitle.trim()) {
      changes.push({
        label: "Job Title",
        oldValue: user.jobTitle || "None",
        newValue: jobTitle.trim() || "None",
      });
      user.jobTitle = jobTitle.trim();
    }

    // Phone
    if (phone !== undefined && (user.phone || "") !== phone.trim()) {
      changes.push({
        label: "Phone Number",
        oldValue: user.phone || "None",
        newValue: phone.trim() || "None",
      });
      user.phone = phone.trim();
    }

    // Location
    if (location !== undefined && (user.location || "") !== location.trim()) {
      changes.push({
        label: "Location",
        oldValue: user.location || "None",
        newValue: location.trim() || "None",
      });
      user.location = location.trim();
    }

    await user.save();

    // Synchronize linked invitation if exists
    try {
      await Invitation.updateMany(
        {
          $or: [{ userId: user._id }, { email: oldEmail }],
        },
        {
          $set: {
            name: user.name,
            email: user.email,
            role: user.role,
            department: user.department,
            responsibility: user.responsibility,
            jobTitle: user.jobTitle,
          },
        }
      );
    } catch (invErr) {
      console.error("Error updating linked invitation:", invErr.message);
    }

    // If changes were made, trigger notification email
    if (changes.length > 0) {
      const clientBaseUrl = config.CLIENT_URL;

      const changesRowsHtml = changes
        .map(
          (c) => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 14px; font-weight: 600; color: #334155;">${c.label}</td>
            <td style="padding: 10px 14px; color: #64748b; text-decoration: line-through;">${c.oldValue}</td>
            <td style="padding: 10px 14px; font-weight: 600; color: #2563eb;">${c.newValue}</td>
          </tr>`
        )
        .join("");

      const emailSubject = "Your AgentraTeam account details have been updated";
      const emailHtml = `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
          <div style="margin-bottom: 20px;">
            <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Hello ${user.name},</h2>
            <p style="color: #475569; font-size: 14px; line-height: 1.5;">
              An administrator has updated your profile credentials, role permissions, or department responsibility on <strong>AgentraTeam</strong>.
            </p>
          </div>

          <div style="margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; text-align: left;">
              <thead>
                <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                  <th style="padding: 10px 14px; color: #475569; font-weight: 700;">Attribute</th>
                  <th style="padding: 10px 14px; color: #475569; font-weight: 700;">Previous</th>
                  <th style="padding: 10px 14px; color: #475569; font-weight: 700;">Updated To</th>
                </tr>
              </thead>
              <tbody>
                ${changesRowsHtml}
              </tbody>
            </table>
          </div>

          <div style="margin: 24px 0;">
            <a href="${clientBaseUrl}" style="background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; display: inline-block;">
              Open Workspace
            </a>
          </div>

          <p style="color: #94a3b8; font-size: 12px; line-height: 1.4; margin-top: 24px; border-top: 1px solid #f1f5f9; padding-top: 16px;">
            If you did not authorize or expect these modifications, please contact your organization administrator immediately.
          </p>
        </div>
      `;

      const recipientEmails = emailChanged ? [user.email, oldEmail] : [user.email];
      for (const recipient of recipientEmails) {
        await sendEmail({
          to: recipient,
          subject: emailSubject,
          html: emailHtml,
        }).catch((err) =>
          console.error(`User update email delivery error to ${recipient}:`, err.message)
        );
      }
    }

    res.status(200).json({
      success: true,
      message: "User details updated successfully",
      changesCount: changes.length,
      user: {
        id: user._id,
        _id: user._id,
        name: user.name,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department,
        responsibility: user.responsibility,
        jobTitle: user.jobTitle,
        phone: user.phone,
        location: user.location,
        status: user.status,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("updateUserDetails error:", error.message);
    res.status(500).json({
      success: false,
      message: "Server error updating user details",
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

    if (isSelfAccount(id, req.user?._id)) {
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
    if (user.isActive) {
      user.approvalStatus = "approved";
    }
    await user.save();

    // If account was activated, update any pending invitation and notify the user
    const clientBaseUrl = config.CLIENT_URL;
    const loginUrl = `${clientBaseUrl}/login`;

    if (user.isActive) {
      try {
        await Invitation.updateMany(
          {
            $or: [{ userId: user._id }, { email: user.email }],
            status: "pending",
          },
          { $set: { status: "accepted", acceptedAt: new Date() } }
        );

        await sendEmail({
          to: user.email,
          subject: "Your AgentraTeam account has been approved and activated!",
          html: accountApprovedTemplate({
            name: user.name,
            loginUrl,
            context: "account",
          }),
        }).catch((err) => console.error("Activation email delivery error:", err.message));
      } catch (invErr) {
        console.error("Error updating invitation on user activation:", invErr.message);
      }
    } else {
      // Account deactivated - trigger deactivation notification email
      try {
        await sendEmail({
          to: user.email,
          subject: "Your AgentraTeam account has been deactivated",
          html: accountDeactivatedTemplate({
            name: user.name,
            clientBaseUrl,
          }),
        }).catch((err) => console.error("Deactivation email delivery error:", err.message));
      } catch (deactErr) {
        console.error("Error sending deactivation email:", deactErr.message);
      }
    }

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

    if (isSelfAccount(id, req.user?._id)) {
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

    // Revoke associated invitation when user is deleted from user db
    try {
      const cleanEmail = (user.email || "").toLowerCase().trim();
      const filter = {
        $or: [{ userId: user._id }, { email: cleanEmail }],
        status: { $ne: "revoked" },
      };

      if (mongoose.connection?.readyState === 1) {
        await Invitation.updateMany(filter, { $set: { status: "revoked" } });
      } else if (typeof Invitation.updateMany === "function") {
        await Promise.race([
          Invitation.updateMany(filter, { $set: { status: "revoked" } }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 200)),
        ]).catch(() => null);
      }

      // Trigger revocation notification email
      const clientBaseUrl = config.CLIENT_URL;

      await sendEmail({
        to: user.email,
        subject: "Your AgentraTeam invitation has been revoked",
        html: accountRevokedTemplate({
          name: user.name,
          clientBaseUrl,
          context: "user_deleted",
        }),
      }).catch((err) =>
        console.error("Revoke on delete email delivery error:", err.message)
      );
    } catch (invErr) {
      console.error("Error revoking invitation on user deletion:", invErr.message);
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
      phoneNumber,
      location,
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
    if (existing && existing.isActive) {
      return res.status(409).json({
        success: false,
        message: "A user with this email already exists.",
      });
    }

    const validRoles = ["admin", "manager", "member"];
    let assignedRole = "member";
    if (role) {
      const normalized = role.toLowerCase().trim();
      if (validRoles.includes(normalized)) {
        assignedRole = normalized;
      }
    }

    const userPhone = phone || phoneNumber || "";

    // Delegate invitation creation and email delivery to invitation.service
    const { invitation, user: newUser, temporaryPassword } = await createInvitation({
      adminUser: req.user || { _id: new mongoose.Types.ObjectId() },
      name,
      email: cleanEmail,
      role: assignedRole,
      jobTitle,
      department,
      responsibility,
      phone: userPhone,
      location,
      password,
      username,
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
        ...(temporaryPassword && { temporaryPassword }),
      },
      ...(invitation && { invitationId: invitation._id }),
    });
  } catch (error) {
    console.error("createAdminUser error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Server error creating user",
      ...(error.invitation && { invitationId: error.invitation._id }),
    });
  }
};

