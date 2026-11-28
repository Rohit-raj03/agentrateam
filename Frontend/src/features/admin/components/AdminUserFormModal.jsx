import React from "react";
import { UserPlus, X, Check, Loader2 } from "lucide-react";
import {
  DEPARTMENT_OPTIONS,
  getJobTitles,
} from "../constants/departments.js";

/**
 * Feature Subcomponent: AdminUserFormModal
 * Layer: features/admin/components/
 * Responsibility: Modal form dialog for adding new members or editing existing user attributes with dependent department & job title selection.
 */
export const AdminUserFormModal = ({
  isOpen,
  onClose,
  editingUser,
  formData,
  onFieldChange,
  onSubmit,
  formError,
  title,
  submitLabel,
  loading = false,
}) => {
  if (!isOpen) return null;

  const currentJobTitles = getJobTitles(formData.department);
  const hasCustomJobTitle =
    formData.jobTitle &&
    !currentJobTitles.some((jt) => jt.label === formData.jobTitle);

  const handleDepartmentChange = (e) => {
    const newDept = e.target.value;
    const jobTitles = getJobTitles(newDept);
    const firstJobTitle = jobTitles[0];

    onFieldChange("department", newDept);
    onFieldChange("jobTitle", firstJobTitle ? firstJobTitle.label : "");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-100 bg-slate-50/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-primary flex items-center justify-center">
              <UserPlus size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                {title ||
                  (editingUser
                    ? "Edit User Information"
                    : "Add New Organization Member")}
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure profile credentials, role permissions, and department job title
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-6 space-y-4 text-xs">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl font-medium">
              {formError}
            </div>
          )}

          {/* Row 1: Full Name & Username */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Vikram Joshi"
                value={formData.name || ""}
                onChange={(e) => onFieldChange("name", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">Username</label>
                <span className="text-[10px] text-slate-400 font-medium">Optional</span>
              </div>
              <input
                type="text"
                placeholder="e.g. vikramj"
                value={formData.username || ""}
                onChange={(e) => onFieldChange("username", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Row 2: Email Address & System Role */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">
                Email Address <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="e.g. vikram@agentrazira.io"
                value={formData.email || ""}
                onChange={(e) => onFieldChange("email", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">
                System Role <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.role || "Member"}
                onChange={(e) => onFieldChange("role", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
                <option value="Member">Member</option>
              </select>
            </div>
          </div>

          {/* Row 3: Department & Job Title (Dependent Select) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="font-bold text-slate-700">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                required
                value={formData.department || ""}
                onChange={handleDepartmentChange}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="" disabled>
                  -- Select Department --
                </option>
                {DEPARTMENT_OPTIONS.map((dept) => (
                  <option key={dept.value} value={dept.value}>
                    {dept.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-slate-700">
                Job Title <span className="text-rose-500">*</span>
              </label>
              <select
                required
                disabled={!formData.department}
                value={formData.jobTitle || ""}
                onChange={(e) => onFieldChange("jobTitle", e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                <option value="" disabled>
                  {formData.department
                    ? "-- Select Job Title --"
                    : "Select Department first"}
                </option>
                {hasCustomJobTitle && (
                  <option value={formData.jobTitle}>{formData.jobTitle}</option>
                )}
                {currentJobTitles.map((jt) => (
                  <option key={jt.value} value={jt.label}>
                    {jt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-xl border border-slate-200 font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>
                    {submitLabel
                      ? `${submitLabel.replace(/^(Invite|Save|Create)\s*/i, "") ? submitLabel + "..." : "Processing..."}`
                      : editingUser
                      ? "Saving..."
                      : "Inviting..."}
                  </span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>{submitLabel || (editingUser ? "Save Changes" : "Create User")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminUserFormModal;
