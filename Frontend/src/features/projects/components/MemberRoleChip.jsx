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
 * - Padding: px-2 py-0.5
 * - Border radius: rounded-md
 * - Font: text-[10px] font-semibold
 * - Shadow: shadow-2xs
 * - Icon: size={12}, strokeWidth={2.2}, flexShrink: 0
 * - Remove button: rgb(67, 97, 238)
 */
export const MemberRoleChip = ({
  tag,
  onRemove,
  removable = true,
  className = "",
  maxWidthClass = "max-w-22.5 sm:max-w-30",
}) => {
  const { Icon: RoleIcon, color: iconColor } = getRoleTagConfig(tag);

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border shadow-2xs shrink-0 transition-all hover:brightness-95 ${className}`}
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
          className="opacity-70 hover:opacity-100 rounded p-0.5 transition-opacity cursor-pointer"
          style={{ color: "rgb(67, 97, 238)" }}
          title={`Remove ${tag} role`}
          aria-label={`Remove ${tag} role`}
        >
          <X size={9} strokeWidth={2.5} />
        </button>
      )}
    </span>
  );
};

export default MemberRoleChip;
