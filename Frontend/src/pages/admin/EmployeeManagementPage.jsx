import React, { useState, useMemo } from "react";
import { UserPlus, Mail, Clock, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useInvitations } from "../../features/team/hooks/useInvitations.js";
import { InvitationTable } from "../../features/team/components/InvitationTable.jsx";
import { AdminUserFormModal } from "../../features/admin/components/AdminUserFormModal.jsx";
import { DEFAULT_INVITE_FORM_DATA } from "../../features/admin/constants/departments.js";
import { Button } from "../../shared/components/ui/Button.jsx";
import { ROUTES } from "../../shared/constants/routes.js";

/**
 * Presentation Layer: EmployeeManagementPage
 * Layer: pages/admin/
 * Comprehensive administrative console for managing employee onboarding invitations.
 */
export const EmployeeManagementPage = () => {
  const {
    invitations,
    loading,
    actionLoadingId,
    inviteEmployee,
    resendInvitation,
    revokeInvitation,
    approveInvitation,
  } = useInvitations();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [inviteFormData, setInviteFormData] = useState(DEFAULT_INVITE_FORM_DATA);
  const [inviteFormError, setInviteFormError] = useState("");

  // Compute metrics
  const stats = useMemo(() => {
    const total = invitations.length;
    const pending = invitations.filter((i) => i.status === "pending").length;
    const accepted = invitations.filter((i) => i.status === "accepted").length;
    const expiredOrRevoked = invitations.filter(
      (i) => i.status === "expired" || i.status === "revoked"
    ).length;
    return { total, pending, accepted, expiredOrRevoked };
  }, [invitations]);

  const handleFieldChange = (field, value) => {
    setInviteFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleCreateInvite = async (e) => {
    e.preventDefault();
    if (!inviteFormData.name?.trim() || !inviteFormData.email?.trim() || isSubmitting) {
      setInviteFormError("Please enter both name and email address.");
      return;
    }
    setInviteFormError("");
    setIsSubmitting(true);
    try {
      await inviteEmployee(inviteFormData);
      setIsInviteModalOpen(false);
      setInviteFormData(DEFAULT_INVITE_FORM_DATA);
    } catch (err) {
      setInviteFormError(
        err?.response?.data?.message || err?.message || "Failed to send invitation."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/50 p-6 md:p-8 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 mb-1">
            <Link
              to={ROUTES.ADMIN}
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <ArrowLeft size={14} />
              Admin Console
            </Link>
            <span>/</span>
            <span className="text-slate-900">Employee Management</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Employee Invitations
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Send onboarding invitations, track real-time delivery statuses, and configure team roles.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            onClick={() => {
              setInviteFormData(DEFAULT_INVITE_FORM_DATA);
              setInviteFormError("");
              setIsInviteModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-xs"
          >
            <UserPlus size={16} />
            <span>Invite Employee</span>
          </Button>
        </div>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Dispatched</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-primary flex items-center justify-center">
              <Mail size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Acceptance</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.pending}</p>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Active Employees</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.accepted}</p>
        </div>

        <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Expired / Revoked</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <AlertCircle size={16} />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{stats.expiredOrRevoked}</p>
        </div>
      </div>

      {/* Main Table */}
      <InvitationTable
        invitations={invitations}
        isLoading={loading}
        onResend={resendInvitation}
        onRevoke={revokeInvitation}
        onApprove={approveInvitation}
        actionLoadingId={actionLoadingId}
      />

      {/* Invite Modal */}
      <AdminUserFormModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        formData={inviteFormData}
        onFieldChange={handleFieldChange}
        onSubmit={handleCreateInvite}
        formError={inviteFormError}
        submitLabel="Invite Employee"
        loading={isSubmitting}
      />
    </div>
  );
};

export default EmployeeManagementPage;
