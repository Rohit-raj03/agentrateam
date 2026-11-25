import invitationService from "../services/invitation.service.js";
import { getRefreshTokenCookieOptions } from "../utils/generateToken.js";

/**
 * Format standard authenticated user payload matching existing auth conventions
 */
const formatAuthResponse = (user, accessToken, refreshToken) => ({
  success: true,
  message: "Account accepted and activated successfully",
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
    department: user.department,
    avatar: user.avatar,
    phone: user.phone,
    location: user.location,
    isEmailVerified: user.isEmailVerified,
  },
});

/**
 * @desc    Create and send employee invitation
 * @route   POST /api/invitations
 * @access  Private (Admin only)
 */
export const createInvitation = async (req, res) => {
  try {
    const { name, email, role, jobTitle, department, jobProfile, phoneNumber, location } =
      req.body || {};

    const { invitation } = await invitationService.createInvitation({
      adminUser: req.user,
      name,
      email,
      role,
      jobTitle,
      department,
      jobProfile,
      phoneNumber,
      location,
    });

    return res.status(201).json({
      success: true,
      message: `Invitation successfully sent to ${invitation.email}`,
      data: invitation,
    });
  } catch (error) {
    console.error("createInvitation error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to create and dispatch invitation",
      ...(error.invitation && { data: error.invitation }),
    });
  }
};

/**
 * @desc    Get all invitations with filtering & pagination
 * @route   GET /api/invitations
 * @access  Private (Admin only)
 */
export const getInvitations = async (req, res) => {
  try {
    const { page, limit, status, search } = req.query || {};
    const result = await invitationService.getInvitations({
      page,
      limit,
      status,
      search,
    });

    return res.status(200).json({
      success: true,
      count: result.invitations.length,
      total: result.total,
      page: result.page,
      totalPages: result.totalPages,
      data: result.invitations,
      invitations: result.invitations,
    });
  } catch (error) {
    console.error("getInvitations error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to retrieve invitations",
    });
  }
};

/**
 * @desc    Resend invitation with a newly generated secure token
 * @route   POST /api/invitations/:id/resend
 * @access  Private (Admin only)
 */
export const resendInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const { invitation } = await invitationService.resendInvitation({
      id,
      adminUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: `Fresh invitation successfully resent to ${invitation.email}`,
      data: invitation,
    });
  } catch (error) {
    console.error("resendInvitation error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to resend invitation",
      ...(error.invitation && { data: error.invitation }),
    });
  }
};

/**
 * @desc    Revoke an active invitation
 * @route   DELETE /api/invitations/:id
 * @access  Private (Admin only)
 */
export const revokeInvitation = async (req, res) => {
  try {
    const { id } = req.params;
    const invitation = await invitationService.revokeInvitation({ id });

    return res.status(200).json({
      success: true,
      message: "Invitation successfully revoked",
      data: invitation,
    });
  } catch (error) {
    console.error("revokeInvitation error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to revoke invitation",
    });
  }
};

/**
 * @desc    Update invitation status (accepted, revoked, pending)
 * @route   PATCH /api/invitations/:id/status
 * @access  Private (Admin only)
 */
export const updateInvitationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const invitation = await invitationService.updateInvitationStatus({
      id,
      status,
      adminUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: `Invitation status successfully updated to '${invitation.status}'`,
      data: invitation,
    });
  } catch (error) {
    console.error("updateInvitationStatus error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to update invitation status",
    });
  }
};

/**
 * @desc    Verify invitation token before presenting acceptance form
 * @route   GET /api/invitations/verify/:token
 * @access  Public
 */
export const verifyInvitationToken = async (req, res) => {
  try {
    const { token } = req.params;
    const data = await invitationService.verifyInvitationToken(token);

    return res.status(200).json({
      success: true,
      data,
    });
  } catch (error) {
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to verify invitation token",
    });
  }
};

/**
 * @desc    Accept invitation, create new employee user account, and issue session
 * @route   POST /api/invitations/accept
 * @access  Public
 */
export const acceptInvitation = async (req, res) => {
  try {
    const { token, password, name, credential } = req.body || {};

    const { user, accessToken, refreshToken } =
      await invitationService.acceptInvitation({
        rawToken: token,
        password,
        name,
        credential,
      });

    // Establish refresh cookie matching existing auth architecture
    res.cookie("refreshToken", refreshToken, getRefreshTokenCookieOptions());

    return res
      .status(201)
      .json(formatAuthResponse(user, accessToken, refreshToken));
  } catch (error) {
    console.error("acceptInvitation error:", error.message);
    return res.status(error.statusCode || 500).json({
      success: false,
      message: error.message || "Failed to accept invitation",
    });
  }
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
