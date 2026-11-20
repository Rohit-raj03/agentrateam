/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { X } from "lucide-react";
import {
  getRoleTagConfig,
  ROLE_ICON_CONFIG,
} from "../../../shared/data/assignedTags.js";

export { getRoleTagConfig, ROLE_ICON_CONFIG };

/**
 * Member Tag / Role Chip Component
 *
 * Strict Styling Constraints:
 * - Background: rgba(67, 97, 238, 0.12)
 * - Text color: rgb(67, 97, 238)
 * - Border color: rgba(67, 97, 238, 0.35)
 * - Padding: px-2.5 py-1
 * - Border radius: rounded-md
 * - Font: text-xs font-mono
 * - Shadow: shadow-2xs
 * - Icon: size={12}, strokeWidth={2.2}, flexShrink: 0
 * - Remove button: clearly clickable with no overlapping elements
 */
export const MemberRoleChip = ({
  tag,
  onRemove,
  removable = true,
  className = "",
  maxWidthClass = "max-w-28 sm:max-w-36",
}) => {
  const { Icon: RoleIcon, color: iconColor } = getRoleTagConfig(tag);

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-sans font-semibold border shadow-2xs shrink-0 transition-all hover:brightness-95 ${className}`}
      style={{
        backgroundColor: "rgba(67, 97, 238, 0.12)",
        color: "rgb(67, 97, 238)",
        borderColor: "rgba(67, 97, 238, 0.35)",
      }}
    >
      {RoleIcon && (
        <RoleIcon
          size={12}
          strokeWidth={2.2}
          style={{ color: iconColor, flexShrink: 0 }}
          className="shrink-0"
        />
      )}
      <span className={`truncate ${maxWidthClass}`}>{tag}</span>
      {removable && onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="opacity-75 hover:opacity-100 hover:bg-indigo-100/60 rounded p-0.5 transition-all cursor-pointer ml-0.5"
          style={{ color: "rgb(67, 97, 238)" }}
          title={`Remove ${tag} role`}
          aria-label={`Remove ${tag} role`}
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
};

export default MemberRoleChip;
