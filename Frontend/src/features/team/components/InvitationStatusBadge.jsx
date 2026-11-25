import React from "react";
import { Clock, CheckCircle2, AlertCircle, XCircle } from "lucide-react";

const STATUS_CONFIGS = {
  pending: {
    label: "Pending",
    icon: Clock,
    badgeClasses: "bg-amber-50 text-amber-700 border-amber-200/70",
    dotClasses: "bg-amber-500",
  },
  accepted: {
    label: "Accepted",
    icon: CheckCircle2,
    badgeClasses: "bg-emerald-50 text-emerald-700 border-emerald-200/70",
    dotClasses: "bg-emerald-500",
  },
  expired: {
    label: "Expired",
    icon: AlertCircle,
    badgeClasses: "bg-slate-100 text-slate-600 border-slate-200",
    dotClasses: "bg-slate-400",
  },
  revoked: {
    label: "Revoked",
    icon: XCircle,
    badgeClasses: "bg-rose-50 text-rose-700 border-rose-200/70",
    dotClasses: "bg-rose-500",
  },
};

/**
 * Feature Component: InvitationStatusBadge
 * Layer: features/team/components/
 */
export const InvitationStatusBadge = ({ status = "pending", showIcon = true, className = "" }) => {
  const normalized = (status || "pending").toLowerCase();
  const config = STATUS_CONFIGS[normalized] || STATUS_CONFIGS.pending;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${config.badgeClasses} ${className}`}
    >
      {showIcon && <Icon size={13} className="shrink-0" />}
      <span>{config.label}</span>
    </span>
  );
};

export default InvitationStatusBadge;
