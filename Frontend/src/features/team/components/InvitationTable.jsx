import React, { useState } from "react";
import { Mail, RefreshCw, Ban, User, Calendar, Shield, Loader2, Search, UserCheck } from "lucide-react";
import { InvitationStatusBadge } from "./InvitationStatusBadge.jsx";
import { Button } from "../../../shared/components/ui/Button.jsx";
import { formatDate } from "../../../shared/utils/formatDate.js";
import { Avatar } from "../../../shared/components/ui/Avatar.jsx";

/**
 * Feature Component: InvitationTable
 * Layer: features/team/components/
 * Presents organization employee invitations in a responsive data table with row actions.
 */
export const InvitationTable = ({
  invitations = [],
  isLoading = false,
  onResend,
  onRevoke,
  onApprove,
  actionLoadingId = null,
}) => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filtered = invitations.filter((inv) => {
    const matchesStatus =
      statusFilter === "ALL" ||
      (inv.status || "").toLowerCase() === statusFilter.toLowerCase();
    const query = search.toLowerCase().trim();
    const matchesSearch =
      !query ||
      inv.name?.toLowerCase().includes(query) ||
      inv.email?.toLowerCase().includes(query) ||
      inv.department?.toLowerCase().includes(query) ||
      inv.jobTitle?.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, email or department..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {["ALL", "PENDING", "ACCEPTED", "EXPIRED", "REVOKED"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                statusFilter === st
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-slate-100/70 text-slate-600 hover:bg-slate-200/70"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50/80 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
            <tr>
              <th className="px-5 py-3.5">Employee</th>
              <th className="px-5 py-3.5">Role &amp; Department</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Expires</th>
              <th className="px-5 py-3.5">Invited By</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Loader2 size={24} className="animate-spin text-primary" />
                    <p className="text-sm font-medium">Loading employee invitations...</p>
                  </div>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
                      <Mail size={22} />
                    </div>
                    <p className="text-sm font-semibold text-slate-700">No invitations found</p>
                    <p className="text-xs text-slate-400 max-w-sm">
                      {search || statusFilter !== "ALL"
                        ? "No invitations match your current filter criteria."
                        : "No invitations have been dispatched yet. Click 'Invite Employee' to get started."}
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map((inv) => {
                const isActionLoading = actionLoadingId === inv._id;
                const isPending = inv.status === "pending";
                const isAccepted = inv.status === "accepted";

                return (
                  <tr key={inv._id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Employee Info */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 font-bold flex items-center justify-center text-sm shrink-0 uppercase">
                          {inv.name ? inv.name.charAt(0) : "E"}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-900 leading-tight">{inv.name}</p>
                          <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                            <Mail size={12} className="text-slate-400" />
                            <span>{inv.email}</span>
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Role & Department */}
                    <td className="px-5 py-3.5">
                      <div className="space-y-0.5">
                        <span className="inline-block px-2 py-0.5 rounded-md text-[11px] font-semibold bg-slate-100 text-slate-700 uppercase tracking-wider">
                          {inv.role}
                        </span>
                        <p className="text-xs text-slate-600 font-medium">
                          {inv.jobTitle || "Team Member"}
                        </p>
                        {inv.jobProfile && (
                          <p className="text-[11px] text-slate-500 font-normal">
                            Profile: {inv.jobProfile}
                          </p>
                        )}
                        {inv.department && (
                          <p className="text-[11px] text-slate-400">{inv.department}</p>
                        )}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="px-5 py-3.5">
                      <InvitationStatusBadge status={inv.status} />
                    </td>

                    {/* Expiry */}
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={13} className="text-slate-400 shrink-0" />
                        <span>
                          {inv.expiresAt
                            ? formatDate(inv.expiresAt, "MMM D, YYYY h:mm A")
                            : "—"}
                        </span>
                      </div>
                    </td>

                    {/* Invited By */}
                    <td className="px-5 py-3.5 text-xs text-slate-600">
                      <div className="flex items-center gap-2">
                        {inv.invitedBy?.avatar ? (
                          <Avatar
                            src={inv.invitedBy.avatar}
                            alt={inv.invitedBy.name}
                            size="xs"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                            {(inv.invitedBy?.name || "A").charAt(0).toUpperCase()}
                          </div>
                        )}
                        <span className="truncate max-w-[120px]">
                          {inv.invitedBy?.name || "Administrator"}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Approve Action */}
                        {isPending && onApprove && (
                          <button
                            type="button"
                            onClick={() => onApprove(inv._id)}
                            disabled={isActionLoading}
                            title="Approve & activate invitation"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors font-semibold text-[11px] cursor-pointer disabled:opacity-40"
                          >
                            {isActionLoading ? (
                              <Loader2 size={13} className="animate-spin text-emerald-600" />
                            ) : (
                              <UserCheck size={13} className="text-emerald-600" />
                            )}
                            <span>Approve</span>
                          </button>
                        )}

                        {/* Resend Action */}
                        {!isAccepted && onResend && (
                          <button
                            type="button"
                            onClick={() => onResend(inv._id)}
                            disabled={isActionLoading}
                            title="Resend invitation with a fresh token"
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            {isActionLoading ? (
                              <Loader2 size={16} className="animate-spin text-indigo-600" />
                            ) : (
                              <RefreshCw size={15} />
                            )}
                          </button>
                        )}

                        {/* Revoke Action */}
                        {isPending && onRevoke && (
                          <button
                            type="button"
                            onClick={() => onRevoke(inv._id)}
                            disabled={isActionLoading}
                            title="Revoke invitation"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40 cursor-pointer"
                          >
                            {isActionLoading ? (
                              <Loader2 size={15} className="animate-spin text-rose-600" />
                            ) : (
                              <Ban size={15} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InvitationTable;
