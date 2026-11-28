import crypto from "node:crypto";
import mongoose from "mongoose";
import Invitation from "../models/invitation.model.js";
import UserModel from "../models/user.model.js";
import {
  generateInvitationToken,
  hashInvitationToken,
} from "../utils/invitationToken.js";
import { sendEmail } from "./email.service.js";
import invitationTemplate from "../templates/invitation.template.js";
import {
  accountApprovedTemplate,
  accountRevokedTemplate,
} from "../templates/accountStatus.template.js";
import config from "../config/config.js";
import { generateAccessAndRefreshTokens } from "../utils/generateToken.js";
import { hashRefreshToken } from "./auth.service.js";
import { verifyGoogleToken } from "./google-auth.service.js";
import { escapeRegex } from "../utils/regex.util.js";

const DEFAULT_EXPIRY_HOURS = 48;

/**
 * Validates email format using standard RFC 5322 regex pattern
 */
const isValidEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const re = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  return re.test(email.trim());
};

/**
 * Validate MongoDB ObjectId format
 */
const validateObjectId = (id, message = "Valid invitation ID is required") => {
  if (!id || !mongoose.isValidObjectId(id)) {
    const error = new Error(message);
    error.statusCode = 400;
    throw error;
  }
};

/**
 * Generate a cryptographically secure token with expiry metadata
 */
const generateTokenWithExpiry = () => {
  const { rawToken, tokenHash } = generateInvitationToken();
  const expiryHours =
    Number(process.env.INVITATION_EXPIRY_HOURS) || DEFAULT_EXPIRY_HOURS;
  const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);
  return { rawToken, tokenHash, expiryHours, expiresAt };
};

/**
 * Render invitation template and dispatch email
 */
const dispatchInvitationEmail = async ({ invitation, rawToken, expiryHours }) => {
  const clientBaseUrl = config.CLIENT_URL;
  const invitationUrl = `${clientBaseUrl}/accept-invitation?token=${rawToken}`;

  const html = invitationTemplate({
    name: invitation.name,
    jobTitle: invitation.jobTitle,
    department: invitation.department,
    jobProfile: invitation.jobProfile,
    role: invitation.role,
    invitationUrl,
    expiresHours: expiryHours,
  });

  const emailResult = await sendEmail({
    to: invitation.email,
    subject: "You're invited to join AgentraZira!",
    html,
  });

  if (!emailResult || !emailResult.success) {
    throw new Error(emailResult?.error || "Failed to deliver email");
  }

  return emailResult;
};

/**
 * Admin Service: Create and dispatch an employee invitation
 */
export const createInvitation = async ({
  adminUser,
  name,
  email,
  role = "member",
  jobTitle,
  department,
  jobProfile,
  responsibility,
  phoneNumber,
  phone,
  location,
  password,
  username,
}) => {
  if (!adminUser || !adminUser._id) {
    const error = new Error("Authenticated administrator context required");
    error.statusCode = 401;
    throw error;
  }

  // 1. Validate Form Fields
  if (!name || typeof name !== "string" || !name.trim()) {
    const error = new Error("Employee full name is required");
    error.statusCode = 400;
    throw error;
  }

  if (!email || !isValidEmail(email)) {
    const error = new Error("A valid email address is required");
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = email.toLowerCase().trim();

  // Validate and sanitize phone number if provided
  const rawPhone = phoneNumber || phone || "";
  let cleanPhoneNumber = "";
  if (rawPhone && typeof rawPhone === "string" && rawPhone.trim()) {
    const digitsOnly = rawPhone.trim().replace(/[\s\-\(\)\.]/g, "");
    if (digitsOnly.length < 10 || digitsOnly.length > 15) {
      const error = new Error("Phone number must be between 10 and 15 digits");
      error.statusCode = 400;
      throw error;
    }
    cleanPhoneNumber = digitsOnly;
  }

  const effectiveProfile = (jobProfile || responsibility || "").trim();

  // 2. Role Enforcement (Only Admin, Manager, Member allowed)
  const normalizedRole = (role || "member").toLowerCase().trim();
  if (!["admin", "manager", "member"].includes(normalizedRole)) {
    const error = new Error("Role must be 'admin', 'manager', or 'member'");
    error.statusCode = 400;
    throw error;
  }

  const invitationRole = normalizedRole;

  // 3. Check if account already exists
  const existingUser = await UserModel.findOne({ email: cleanEmail });
  if (existingUser && existingUser.isActive) {
    const error = new Error("An account with this email address is already registered");
    error.statusCode = 409;
    throw error;
  }

  // 4. Check for active pending invitation
  let activeInvitation = null;
  try {
    activeInvitation = await Promise.race([
      Invitation.findOne({ email: cleanEmail, status: "pending" }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("MongooseBufferTimeout")), 200)
      ),
    ]);
  } catch (findErr) {
    if (findErr.message !== "MongooseBufferTimeout") {
      throw findErr;
    }
    activeInvitation = null;
  }

  if (activeInvitation) {
    if (!activeInvitation.isExpired()) {
      const error = new Error(
        "A pending invitation for this email address already exists. You can resend or revoke it."
      );
      error.statusCode = 409;
      error.invitationId = activeInvitation._id;
      throw error;
    }
    // Automatically transition stale pending to expired
    activeInvitation.status = "expired";
    await activeInvitation.save();
  }

  // Determine password (explicit or secure generated)
  const isGeneratedPassword =
    !password || typeof password !== "string" || password.trim().length < 6;
  const finalPassword = isGeneratedPassword
    ? `${crypto.randomBytes(12).toString("hex")}A1!`
    : password.trim();

  // Create User with isActive: true if not already existing
  let user = existingUser;
  if (!user) {
    user = await UserModel.create({
      name: name.trim(),
      email: cleanEmail,
      username: username?.trim() || cleanEmail.split("@")[0],
      password: finalPassword,
      role: normalizedRole,
      jobTitle: (jobTitle || "Team Member").trim(),
      department: (department || "").trim(),
      responsibility: effectiveProfile,
      phone: cleanPhoneNumber,
      location: (location || "Remote").trim(),
      isActive: true,
      approvalStatus: "approved",
    });
  } else {
    user.name = name.trim();
    user.role = normalizedRole;
    if (username?.trim()) user.username = username.trim();
    if (!isGeneratedPassword) user.password = finalPassword;
    if (jobTitle?.trim()) user.jobTitle = jobTitle.trim();
    if (department?.trim()) user.department = department.trim();
    if (effectiveProfile) user.responsibility = effectiveProfile;
    if (cleanPhoneNumber) user.phone = cleanPhoneNumber;
    if (location?.trim()) user.location = location.trim();
    await user.save();
  }

  // 5. Generate cryptographically secure token & hash
  const { rawToken, tokenHash, expiryHours, expiresAt } = generateTokenWithExpiry();

  // 6. Save invitation record
  const invitation = await Invitation.create({
    userId: user._id,
    name: name.trim(),
    email: cleanEmail,
    role: invitationRole,
    jobTitle: (jobTitle || "Team Member").trim(),
    jobProfile: effectiveProfile,
    department: (department || "").trim(),
    phoneNumber: cleanPhoneNumber,
    location: (location || "Remote").trim(),
    tokenHash,
    status: "pending",
    expiresAt,
    invitedBy: adminUser._id,
  });

  // 7. Deliver Email (Preserve retryable state if SMTP fails)
  try {
    await dispatchInvitationEmail({ invitation, rawToken, expiryHours });
  } catch (emailError) {
    console.error("Invitation email delivery error:", emailError.message);
    const failureError = new Error(
      "Invitation was saved, but failed to deliver the invitation email. You can resend it from the invitations list."
    );
    failureError.statusCode = 502;
    failureError.invitation = invitation;
    failureError.user = user;
    throw failureError;
  }

  return {
    invitation,
    rawToken,
    user,
    temporaryPassword: isGeneratedPassword ? finalPassword : undefined,
  };
};

/**
 * Admin Service: Retrieve list of invitations with filters and pagination
 */
export const getInvitations = async ({
  page = 1,
  limit,
  status,
  search,
} = {}) => {
  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 100));
  const skip = (pageNum - 1) * limitNum;

  // Lazily synchronize expired invitations
  await Invitation.updateMany(
    { status: "pending", expiresAt: { $lt: new Date() } },
    { $set: { status: "expired" } }
  );

  const filter = {};

  if (status && ["pending", "accepted", "revoked", "expired"].includes(status)) {
    filter.status = status;
  }

  if (search && typeof search === "string" && search.trim()) {
    const escaped = escapeRegex(search.trim());
    filter.$or = [
      { name: { $regex: escaped, $options: "i" } },
      { email: { $regex: escaped, $options: "i" } },
      { department: { $regex: escaped, $options: "i" } },
      { jobTitle: { $regex: escaped, $options: "i" } },
    ];
  }

  const [invitations, total] = await Promise.all([
    Invitation.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .populate("invitedBy", "name email avatar")
      .select("-tokenHash"),
    Invitation.countDocuments(filter),
  ]);

  return {
    invitations,
    total,
    page: pageNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};

/**
 * Admin Service: Resend an invitation with a fresh token
 */
export const resendInvitation = async ({ id, adminUser }) => {
  validateObjectId(id);

  const invitation = await Invitation.findById(id);
  if (!invitation) {
    const error = new Error("Invitation not found");
    error.statusCode = 404;
    throw error;
  }

  if (invitation.status === "accepted") {
    const error = new Error("Cannot resend an already accepted invitation");
    error.statusCode = 400;
    throw error;
  }

  // Associate existing user if not already linked
  const userExists = await UserModel.findOne({ email: invitation.email });
  if (userExists && !invitation.userId) {
    invitation.userId = userExists._id;
  }

  // Generate fresh token (invalidates previous tokenHash)
  const { rawToken, tokenHash, expiryHours, expiresAt } = generateTokenWithExpiry();

  invitation.tokenHash = tokenHash;
  invitation.status = "pending";
  invitation.expiresAt = expiresAt;
  if (adminUser?._id) {
    invitation.invitedBy = adminUser._id;
  }
  await invitation.save();

  // Send new invitation email
  try {
    await dispatchInvitationEmail({ invitation, rawToken, expiryHours });
  } catch (emailError) {
    console.error("Resend invitation email delivery error:", emailError.message);
    const failureError = new Error(
      "Invitation token was refreshed, but failed to deliver the email. Please check SMTP configuration."
    );
    failureError.statusCode = 502;
    failureError.invitation = invitation;
    throw failureError;
  }

  return { invitation, rawToken };
};

/**
 * Admin Service: Revoke an invitation
 */
export const revokeInvitation = async ({ id }) => {
  validateObjectId(id);

  const invitation = await Invitation.findById(id);
  if (!invitation) {
    const error = new Error("Invitation not found");
    error.statusCode = 404;
    throw error;
  }

  if (invitation.status === "accepted") {
    const error = new Error("Cannot revoke an already accepted invitation");
    error.statusCode = 400;
    throw error;
  }

  invitation.status = "revoked";
  await invitation.save();

  // Delete user from UserModel database upon revocation
  try {
    if (mongoose.connection?.readyState === 1) {
      if (invitation.userId) {
        await UserModel.findByIdAndDelete(invitation.userId);
      }
      if (invitation.email) {
        await UserModel.deleteMany({
          email: invitation.email.toLowerCase().trim(),
          status: "pending",
        });
      }
    } else {
      if (invitation.userId && typeof UserModel.findByIdAndDelete === "function") {
        await Promise.race([
          UserModel.findByIdAndDelete(invitation.userId),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 200)),
        ]).catch(() => null);
      }
      if (invitation.email && typeof UserModel.deleteMany === "function") {
        await Promise.race([
          UserModel.deleteMany({
            email: invitation.email.toLowerCase().trim(),
            status: "pending",
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 200)),
        ]).catch(() => null);
      }
    }
  } catch (userDelErr) {
    console.error("Error deleting user on invitation revoke:", userDelErr.message);
  }

  // Trigger revocation notification email
  const clientBaseUrl = config.CLIENT_URL;

  if (invitation.email) {
    await sendEmail({
      to: invitation.email,
      subject: "Your AgentraZira invitation has been revoked",
      html: accountRevokedTemplate({
        name: invitation.name,
        clientBaseUrl,
        context: "invitation",
      }),
    }).catch((err) =>
      console.error("Revoke invitation email delivery error:", err.message)
    );
  }

  return invitation;
};

/**
 * Shared helper: Lookup invitation by raw token and validate it is pending & unexpired
 */
const resolveAndValidateInvitation = async (rawToken) => {
  if (!rawToken || typeof rawToken !== "string" || !rawToken.trim()) {
    const error = new Error("Invitation token is required");
    error.statusCode = 400;
    throw error;
  }

  const tokenHash = hashInvitationToken(rawToken.trim());
  const invitation = await Invitation.findOne({ tokenHash });

  if (!invitation) {
    const error = new Error("Invalid or unrecognized invitation link");
    error.statusCode = 404;
    throw error;
  }

  if (invitation.status === "accepted") {
    const error = new Error("This invitation has already been accepted");
    error.statusCode = 400;
    throw error;
  }

  if (invitation.status === "revoked") {
    const error = new Error("This invitation has been revoked by an administrator");
    error.statusCode = 400;
    throw error;
  }

  if (invitation.isExpired() || invitation.status === "expired") {
    if (invitation.status !== "expired") {
      invitation.status = "expired";
      await invitation.save().catch(() => {});
    }
    const error = new Error(
      "This invitation has expired. Please contact your administrator for a new invite."
    );
    error.statusCode = 400;
    throw error;
  }

  if (invitation.status !== "pending") {
    const error = new Error("This invitation is not pending and cannot be accepted");
    error.statusCode = 400;
    throw error;
  }

  return invitation;
};

/**
 * Public Service: Verify an invitation token
 */
export const verifyInvitationToken = async (rawToken) => {
  const invitation = await resolveAndValidateInvitation(rawToken);

  // Safe client-facing response without tokenHash
  return {
    email: invitation.email,
    name: invitation.name,
    role: invitation.role,
    jobTitle: invitation.jobTitle,
    jobProfile: invitation.jobProfile,
    department: invitation.department,
    location: invitation.location,
    expiresAt: invitation.expiresAt,
  };
};

/**
 * Public Service: Accept an invitation, set password, and create User account
 */
export const acceptInvitation = async ({
  rawToken,
  password,
  name,
  credential,
}) => {
  if (!rawToken || typeof rawToken !== "string" || !rawToken.trim()) {
    const error = new Error("Invitation token is required");
    error.statusCode = 400;
    throw error;
  }

  let googleUser = null;
  if (credential) {
    googleUser = await verifyGoogleToken(credential);
  } else {
    if (!password || typeof password !== "string" || password.length < 6) {
      const error = new Error("Password must be at least 6 characters long");
      error.statusCode = 400;
      throw error;
    }
  }

  const invitation = await resolveAndValidateInvitation(rawToken);

  // Security check: If accepting with Google, Google email must match the invited email!
  if (googleUser) {
    const googleEmail = (googleUser.email || "").toLowerCase().trim();
    const inviteEmail = (invitation.email || "").toLowerCase().trim();
    if (googleEmail !== inviteEmail) {
      const error = new Error(
        `Google account email (${googleUser.email}) does not match the invitation email (${invitation.email}). Please sign in with the invited Google account.`
      );
      error.statusCode = 400;
      throw error;
    }
  }

  // Role is strictly derived from invitation and cannot be elevated
  const assignedRole = ["admin", "manager", "member"].includes(invitation.role)
    ? invitation.role
    : "member";

  // Check transaction capability
  let session = null;
  let useTransaction = false;

  const topologyType = mongoose.connection?.client?.topology?.description?.type;
  const supportsReplicaTransactions =
    mongoose.connection?.readyState === 1 &&
    (topologyType === "ReplicaSetWithPrimary" ||
      topologyType === "Sharded" ||
      topologyType === "LoadBalanced");

  if (supportsReplicaTransactions) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
      useTransaction = true;
    } catch {
      session = null;
      useTransaction = false;
    }
  }

  const sessionOption = useTransaction && session ? { session } : {};

  // Find existing User by invitation.userId or email
  let existingUser = null;
  if (invitation.userId) {
    existingUser = await UserModel.findById(invitation.userId, null, sessionOption);
  }
  if (!existingUser) {
    existingUser = await UserModel.findOne({ email: invitation.email }, null, sessionOption);
  }

  // Atomically claim the invitation from pending -> accepted
  // Eliminates race conditions even on standalone single-node MongoDB
  const claimedInvitation = await Invitation.findOneAndUpdate(
    { _id: invitation._id, status: "pending" },
    { $set: { status: "accepted", acceptedAt: new Date() } },
    { new: true, ...sessionOption }
  );

  if (!claimedInvitation) {
    const error = new Error("This invitation has already been accepted or is no longer pending");
    error.statusCode = 400;
    throw error;
  }

  // Safe phone number ensuring UserModel validator (10 <= length <= 15) passes
  const cleanPhone = invitation.phoneNumber
    ? invitation.phoneNumber.replace(/[\s\-\(\)\.]/g, "").slice(0, 15)
    : "";

  const effectivePassword =
    password || `${crypto.randomBytes(12).toString("hex")}A1!`;

  try {
    let targetUser = existingUser;
    if (targetUser) {
      if (name && name.trim()) {
        targetUser.name = name.trim();
      } else if (googleUser?.name) {
        targetUser.name = googleUser.name;
      }

      if (googleUser) {
        targetUser.googleId = googleUser.googleId;
        if (!targetUser.avatar && googleUser.avatar) {
          targetUser.avatar = googleUser.avatar;
        }
      }

      if (password) {
        targetUser.password = password; // Hashed by UserModel pre('save') hook
      } else if (!targetUser.password) {
        targetUser.password = effectivePassword;
      }

      targetUser.isActive = true;
      targetUser.approvalStatus = "approved";
      targetUser.isEmailVerified = true;
      if (assignedRole) {
        targetUser.role = assignedRole;
      }
      if (invitation.jobTitle && (!targetUser.jobTitle || targetUser.jobTitle === "Team Member")) {
        targetUser.jobTitle = invitation.jobTitle;
      }
      if (invitation.jobProfile && !targetUser.responsibility) {
        targetUser.responsibility = invitation.jobProfile;
      }
      if (invitation.department && !targetUser.department) {
        targetUser.department = invitation.department;
      }
      if (cleanPhone && !targetUser.phone) {
        targetUser.phone = cleanPhone;
      }
      if (invitation.location && (!targetUser.location || targetUser.location === "Remote")) {
        targetUser.location = invitation.location;
      }
      await targetUser.save(sessionOption);
    } else {
      const userDocs = await UserModel.create(
        [
          {
            name: (name || googleUser?.name || invitation.name).trim(),
            email: invitation.email,
            password: effectivePassword,
            googleId: googleUser?.googleId,
            avatar: googleUser?.avatar || "",
            role: assignedRole,
            jobTitle: invitation.jobTitle || "Team Member",
            responsibility: invitation.jobProfile || "",
            department: invitation.department || "",
            phone: cleanPhone,
            location: invitation.location || "Remote",
            isActive: true,
            approvalStatus: "approved",
            isEmailVerified: true,
          },
        ],
        sessionOption
      );
      targetUser = userDocs[0];
    }

    if (claimedInvitation && !claimedInvitation.userId) {
      claimedInvitation.userId = targetUser._id;
      await claimedInvitation.save(sessionOption).catch(() => {});
    }

    if (useTransaction && session) {
      await session.commitTransaction();
    }

    // Generate authenticated JWT session
    const { accessToken, refreshToken } = generateAccessAndRefreshTokens(
      targetUser,
      targetUser.role
    );

    targetUser.refreshToken = hashRefreshToken(refreshToken);
    await targetUser.save({ validateBeforeSave: false, ...sessionOption });

    // Trigger invitation accepted confirmation email
    const clientBaseUrl = config.CLIENT_URL;

    await sendEmail({
      to: targetUser.email,
      subject: "Welcome to AgentraZira - Invitation Accepted!",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
          <h2>Welcome to AgentraZira, ${targetUser.name}!</h2>
          <p>Your invitation has been successfully accepted and your workspace account is now <strong>ACTIVE</strong>.</p>
          <p>You can now access your projects, tasks, and collaborate with your team:</p>
          <div style="margin: 24px 0;">
            <a href="${clientBaseUrl}/dashboard" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block;">Go to Dashboard</a>
          </div>
          <p style="color: #64748b; font-size: 14px;">If you have any questions, please reach out to your team administrator.</p>
        </div>
      `,
    }).catch((err) =>
      console.error("Accept invitation confirmation email delivery error:", err.message)
    );

    return {
      user: targetUser,
      accessToken,
      refreshToken,
    };
  } catch (error) {
    if (useTransaction && session) {
      await session.abortTransaction();
    } else {
      // Standalone rollback: revert invitation back to pending if user creation failed
      await Invitation.findByIdAndUpdate(invitation._id, {
        $set: { status: "pending", acceptedAt: null },
      }).catch(() => {});
    }
    throw error;
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

/**
 * Admin Service: Update invitation status (accepted, revoked, or pending)
 */
export const updateInvitationStatus = async ({ id, status, adminUser }) => {
  validateObjectId(id);

  const normalizedStatus = (status || "").toLowerCase().trim();
  if (!["accepted", "revoked", "pending"].includes(normalizedStatus)) {
    const error = new Error("Status must be 'accepted', 'revoked', or 'pending'");
    error.statusCode = 400;
    throw error;
  }

  if (normalizedStatus === "revoked") {
    return await revokeInvitation({ id });
  }

  if (normalizedStatus === "pending") {
    return await resendInvitation({ id, adminUser });
  }

  // Updating to 'accepted' (Approval / Activation)
  const invitation = await Invitation.findById(id);
  if (!invitation) {
    const error = new Error("Invitation not found");
    error.statusCode = 404;
    throw error;
  }

  invitation.status = "accepted";
  invitation.acceptedAt = new Date();
  await invitation.save();

  // Find and activate the user in UserModel
  let user = null;
  if (invitation.userId) {
    user = await UserModel.findById(invitation.userId);
  }
  if (!user && invitation.email) {
    user = await UserModel.findOne({ email: invitation.email.toLowerCase().trim() });
  }

  if (user) {
    user.isActive = true;
    user.approvalStatus = "approved";
    await user.save();
  }

  const clientBaseUrl = config.CLIENT_URL;
  const loginUrl = `${clientBaseUrl}/login`;

  await sendEmail({
    to: invitation.email,
    subject: "Your AgentraZira invitation has been approved and activated!",
    html: accountApprovedTemplate({
      name: invitation.name,
      loginUrl,
      context: "invitation",
    }),
  }).catch((err) =>
    console.error("Invitation approval email delivery error:", err.message)
  );

  return invitation;
};

export default {
  createInvitation,
  getInvitations,
  resendInvitation,
  revokeInvitation,
  updateInvitationStatus,
  verifyInvitationToken,
  acceptInvitation,
};
