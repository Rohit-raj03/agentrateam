import { useState, useEffect, useCallback } from "react";
import { invitationService } from "../services/invitationService.js";
import { showToast } from "../../../shared/utils/toast.js";

/**
 * Feature Hook: useInvitations
 * Layer: features/team/hooks/
 * Manages administrative employee invitations lifecycle: fetching, creation, resending, and revocation.
 */
export function useInvitations(options = {}) {
  const { autoFetch = true } = options;
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState(null);

  /**
   * Fetch invitations from server
   */
  const fetchInvitations = useCallback(async (params = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await invitationService.getInvitations(params);
      const data = res?.data?.data || res?.data?.invitations || res?.data || [];
      setInvitations(Array.isArray(data) ? data : []);
      return data;
    } catch (err) {
      console.error("Failed to fetch invitations:", err);
      setError(err);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      fetchInvitations();
    }
  }, [autoFetch, fetchInvitations]);

  /**
   * Send a new employee invitation
   */
  const inviteEmployee = useCallback(
    async (formData) => {
      try {
        const res = await invitationService.inviteEmployee(formData);
        showToast.success(
          res?.data?.message || `Invitation successfully sent to ${formData.email}`
        );
        await fetchInvitations();
        return res?.data;
      } catch (err) {
        showToast.error(
          err,
          "Failed to send invitation. Please check the email address and try again."
        );
        // If invitation document was saved but email dispatch failed (HTTP 502),
        // refresh list so administrator can immediately see and resend it
        if (err.response?.status === 502 || err.response?.data?.data) {
          await fetchInvitations();
        }
        throw err;
      }
    },
    [fetchInvitations]
  );

  /**
   * Shared executor for row-level invitation actions (resend, revoke, approve)
   */
  const runInvitationAction = useCallback(
    async (id, actionFn, defaultSuccessMsg, defaultErrorMsg) => {
      setActionLoadingId(id);
      try {
        const res = await actionFn(id);
        showToast.success(res?.data?.message || defaultSuccessMsg);
        await fetchInvitations();
        return res?.data;
      } catch (err) {
        showToast.error(err, defaultErrorMsg);
        throw err;
      } finally {
        setActionLoadingId(null);
      }
    },
    [fetchInvitations]
  );

  /**
   * Resend an invitation with a fresh token
   */
  const resendInvitation = useCallback(
    (id) =>
      runInvitationAction(
        id,
        invitationService.resendInvitation,
        "Invitation resent successfully.",
        "Failed to resend invitation."
      ),
    [runInvitationAction]
  );

  /**
   * Revoke an active invitation
   */
  const revokeInvitation = useCallback(
    (id) =>
      runInvitationAction(
        id,
        invitationService.revokeInvitation,
        "Invitation revoked successfully.",
        "Failed to revoke invitation."
      ),
    [runInvitationAction]
  );

  /**
   * Approve/activate a pending invitation
   */
  const approveInvitation = useCallback(
    (id) =>
      runInvitationAction(
        id,
        invitationService.approveInvitation,
        "Invitation approved and activated.",
        "Failed to approve invitation."
      ),
    [runInvitationAction]
  );

  return {
    invitations,
    loading,
    error,
    actionLoadingId,
    fetchInvitations,
    inviteEmployee,
    resendInvitation,
    revokeInvitation,
    approveInvitation,
  };
}

export default useInvitations;
