import { apiClient } from "../../../shared/api/apiClient.js";

/**
 * Service Layer: Employee Invitation API Service
 * Encapsulates all HTTP interactions with the backend invitation endpoints.
 */
export const invitationService = {
  /**
   * Retrieve organization invitations (Admin only)
   * @param {Object} [params] - Optional { page, limit, status, search }
   */
  getInvitations: (params) => apiClient.get("/invitations", params),

  /**
   * Dispatch a new employee invitation (Admin only)
   * @param {Object} data - { name, email, role, jobTitle, department, phoneNumber, location }
   */
  inviteEmployee: (data) => apiClient.post("/invitations", data),

  /**
   * Resend an existing invitation with a fresh token (Admin only)
   * @param {string} id - Invitation ObjectId
   */
  resendInvitation: (id) => apiClient.post(`/invitations/${id}/resend`),

  /**
   * Revoke an active invitation (Admin only)
   * @param {string} id - Invitation ObjectId
   */
  revokeInvitation: (id) => apiClient.delete(`/invitations/${id}`),

  /**
   * Update invitation status (Admin only)
   * @param {string} id - Invitation ObjectId
   * @param {string} status - 'accepted', 'revoked', 'pending'
   */
  updateStatus: (id, status) =>
    apiClient.patch(`/invitations/${id}/status`, { status }),

  /**
   * Approve/activate invitation (Admin only)
   * @param {string} id - Invitation ObjectId
   */
  approveInvitation: (id) =>
    apiClient.patch(`/invitations/${id}/status`, { status: "accepted" }),

  /**
   * Verify an invitation token (Public)
   * @param {string} token - Raw hex invitation token
   */
  verifyToken: (token) => apiClient.get(`/invitations/verify/${token}`),

  /**
   * Accept an invitation and set password (Public)
   * @param {Object} data - { token, password, name }
   */
  acceptInvitation: (data) => apiClient.post("/invitations/accept", data),
};

export default invitationService;
