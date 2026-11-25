import crypto from "node:crypto";
import mongoose from "mongoose";
import UserModel from "../models/user.model.js";
import Invitation from "../models/invitation.model.js";
import {
  generateAccessAndRefreshTokens,
  verifyRefreshToken,
} from "../utils/generateToken.js";
import { generateInvitationToken } from "../utils/invitationToken.js";
import { verifyGoogleToken } from "./google-auth.service.js";

/**
 * Synchronize any pending invitation to accepted upon successful login
 */
const syncInvitationOnLogin = async (userId, email) => {
  if (mongoose.connection?.readyState !== 1) return;
  try {
    const validUserId = mongoose.isValidObjectId(userId) ? userId : null;
    const clean = (email || "").toLowerCase().trim();
    const filter = validUserId
      ? { $or: [{ userId: validUserId }, { email: clean }], status: "pending" }
      : { email: clean, status: "pending" };
    await Invitation.updateMany(filter, {
      $set: { status: "accepted", acceptedAt: new Date() },
    });
    if (validUserId) {
      await UserModel.findByIdAndUpdate(validUserId, {
        isActive: true,
        approvalStatus: "approved",
      });
    }
  } catch (err) {
    console.error("Error syncing invitation on login:", err.message);
  }
};

/**
 * SHA-256 hash helper for secure refresh token storage
 */
export const hashRefreshToken = (token) => {
  if (!token || typeof token !== "string") return "";
  return crypto.createHash("sha256").update(token).digest("hex");
};

/**
 * Validate whether a user is eligible to log in (active, approved, not pending, not rejected)
 */
const validateUserLoginEligibility = async (user, cleanEmail) => {
  if (!user.isActive) {
    const pendingInvitation = await Invitation.findOne({
      $or: [{ userId: user._id }, { email: cleanEmail }],
      status: "pending",
    });

    if (pendingInvitation) {
      const error = new Error(
        "Your verification is pending. Please wait for an administrator to approve your account."
      );
      error.statusCode = 403;
      error.code = "PENDING_APPROVAL";
      throw error;
    }

    const error = new Error("Your account is deactivated. Please contact an administrator.");
    error.statusCode = 403;
    error.code = "ACCOUNT_DEACTIVATED";
    throw error;
  }

  if (user.approvalStatus === "pending") {
    const error = new Error(
      "Your account is pending administrator approval. Please wait for an administrator to approve your account."
    );
    error.statusCode = 403;
    error.code = "PENDING_APPROVAL";
    throw error;
  }

  if (user.approvalStatus === "revoked") {
    const error = new Error(
      "Your account access has been revoked by an administrator."
    );
    error.statusCode = 403;
    error.code = "ACCOUNT_REVOKED";
    throw error;
  }
};

/**
 * Finalize authenticated session, synchronize invitation, hash refresh token, and return payload
 */
const finalizeUserSession = async (user, cleanEmail) => {
  const { accessToken, refreshToken } = generateAccessAndRefreshTokens(
    user,
    user.role
  );

  await syncInvitationOnLogin(user._id, cleanEmail);

  user.refreshToken = hashRefreshToken(refreshToken);
  user.lastActive = new Date();
  await user.save({ validateBeforeSave: false });

  return { user, accessToken, refreshToken };
};

/**
 * Check whether a user's email has an active or accepted invitation
 */
const checkIsUserInvited = async (email) => {
  if (mongoose.connection?.readyState !== 1) return false;
  const existingInvitation = await Invitation.findOne({
    email,
    status: { $in: ["pending", "accepted"] },
  }).catch(() => null);
  return Boolean(existingInvitation);
};

/**
 * Auto-create pending invitation record for self-registered users awaiting admin approval
 */
const createPendingSelfRegistrationInvitation = async (user, cleanEmail) => {
  if (mongoose.connection?.readyState !== 1) return;
  try {
    const existingInv = await Invitation.findOne({
      $or: [{ userId: user._id }, { email: cleanEmail }],
    });
    if (!existingInv) {
      const { tokenHash } = generateInvitationToken();
      await Invitation.create({
        userId: user._id,
        name: user.name,
        email: cleanEmail,
        role: "member",
        jobTitle: user.jobTitle || "Team Member",
        tokenHash,
        status: "pending",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        invitedBy: user._id,
      });
    }
  } catch (invErr) {
    console.error("Auto-create invitation error on registration:", invErr.message);
  }
};

/**
 * Register a new user with email and password
 */
export const register = async ({ name, email, password, role, jobTitle }) => {
  if (!name || !email || !password) {
    const error = new Error("Name, email, and password are required");
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = email.toLowerCase().trim();

  const existingUser = await UserModel.findOne({ email: cleanEmail });
  if (existingUser) {
    const error = new Error("Email already registered");
    error.statusCode = 409;
    throw error;
  }

  // Security (SEC-01): Public registration always assigns standard 'member' role
  // Elevated roles (admin, manager) can only be assigned by administrators via admin routes
  const userRole = "member";

  const isInvited = await checkIsUserInvited(cleanEmail);
  const approvalStatus = isInvited ? "approved" : "pending";

  const user = await UserModel.create({
    name: name.trim(),
    email: cleanEmail,
    password,
    role: userRole,
    jobTitle: jobTitle || "Team Member",
    isActive: true,
    approvalStatus,
  });

  if (approvalStatus === "pending") {
    await createPendingSelfRegistrationInvitation(user, cleanEmail);
    return {
      user,
      accessToken: null,
      refreshToken: null,
      message:
        "Registration successful. Your account is pending administrator approval.",
    };
  }

  return await finalizeUserSession(user, cleanEmail);
};

/**
 * Authenticate existing user with email and password
 */
export const login = async ({ email, password }) => {
  if (!email || !password) {
    const error = new Error("Email and password are required");
    error.statusCode = 400;
    throw error;
  }

  const cleanEmail = email.toLowerCase().trim();
  const user = await UserModel.findOne({ email: cleanEmail });

  if (!user) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  if (!user.password && user.googleId) {
    const error = new Error("Account was created with Google. Please sign in with Google.");
    error.statusCode = 401;
    throw error;
  }

  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    const error = new Error("Invalid email or password");
    error.statusCode = 401;
    throw error;
  }

  await validateUserLoginEligibility(user, cleanEmail);
  return await finalizeUserSession(user, cleanEmail);
};

/**
 * Authenticate or register user via verified Google ID Token
 */
export const loginWithGoogle = async (credential) => {
  const googleUser = await verifyGoogleToken(credential);
  const cleanEmail = (googleUser.email || "").toLowerCase().trim();

  // 1. Check if user already exists by Google ID
  let user = await UserModel.findOne({ googleId: googleUser.googleId });

  if (user) {
    await validateUserLoginEligibility(user, cleanEmail);
    const session = await finalizeUserSession(user, cleanEmail);
    return { ...session, isNewUser: false };
  }

  // 2. Check if user exists by verified email (Account Linking)
  user = await UserModel.findOne({ email: cleanEmail });

  if (user) {
    await validateUserLoginEligibility(user, cleanEmail);

    // Link Google account without touching existing password
    user.googleId = googleUser.googleId;
    user.isEmailVerified = true;
    if (!user.avatar && googleUser.avatar) {
      user.avatar = googleUser.avatar;
    }

    const session = await finalizeUserSession(user, cleanEmail);
    return { ...session, isNewUser: false };
  }

  // 3. New User Registration via Google
  const isInvited = await checkIsUserInvited(cleanEmail);
  const approvalStatus = isInvited ? "approved" : "pending";

  user = await UserModel.create({
    name: googleUser.name,
    email: cleanEmail,
    googleId: googleUser.googleId,
    avatar: googleUser.avatar,
    isEmailVerified: true,
    role: "member",
    jobTitle: "Team Member",
    isActive: true,
    approvalStatus,
  });

  if (approvalStatus === "pending") {
    await createPendingSelfRegistrationInvitation(user, cleanEmail);

    const error = new Error(
      "Your Google account has been registered, but is pending administrator approval before you can access the application."
    );
    error.statusCode = 403;
    error.code = "PENDING_APPROVAL";
    throw error;
  }

  const session = await finalizeUserSession(user, cleanEmail);
  return { ...session, isNewUser: true };
};

/**
 * Refresh access token using rotated refresh token
 */
export const refreshSession = async (incomingRefreshToken) => {
  if (!incomingRefreshToken) {
    const error = new Error("Refresh token is required");
    error.statusCode = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(incomingRefreshToken);
  } catch (err) {
    const error = new Error("Invalid or expired refresh token");
    error.statusCode = 401;
    throw error;
  }

  const userId = decoded.userId || decoded.id;
  const user = await UserModel.findById(userId);

  if (!user || !user.isActive) {
    const error = new Error("Session expired or user inactive");
    error.statusCode = 401;
    throw error;
  }

  // Reject empty/missing user.refreshToken
  if (!user.refreshToken) {
    const error = new Error("Invalid or revoked refresh token. Please sign in again.");
    error.statusCode = 401;
    throw error;
  }

  const incomingHash = hashRefreshToken(incomingRefreshToken);
  const storedHash = user.refreshToken;

  const incomingBuffer = Buffer.from(incomingHash, "hex");
  const storedBuffer = Buffer.from(storedHash, "hex");

  const isMatch =
    incomingBuffer.length === storedBuffer.length &&
    crypto.timingSafeEqual(incomingBuffer, storedBuffer);

  // Check token reuse / mismatch
  if (!isMatch) {
    user.refreshToken = "";
    await user.save({ validateBeforeSave: false });
    const error = new Error("Invalid or revoked refresh token. Please sign in again.");
    error.statusCode = 403;
    throw error;
  }

  // Rotate token
  const { accessToken, refreshToken: newRefreshToken } =
    generateAccessAndRefreshTokens(user, user.role);

  user.refreshToken = hashRefreshToken(newRefreshToken);
  user.lastActive = new Date();
  await user.save({ validateBeforeSave: false });

  return { user, accessToken, refreshToken: newRefreshToken };
};

/**
 * Logout and invalidate session
 */
export const logout = async (userId) => {
  if (userId) {
    await UserModel.findByIdAndUpdate(userId, { refreshToken: "" });
  }
  return true;
};

export default {
  register,
  login,
  loginWithGoogle,
  refreshSession,
  logout,
  hashRefreshToken,
};

