import React from "react";
import { MemberSelector } from "../../../shared/components/ui/MemberSelector.jsx";

/**
 * Feature Component: TaskAssigneeSelector
 * Layer: features/tasks/components/
 * Responsibility: Multi-select team member assignees for tasks.
 * Reuses the canonical shared MemberSelector component to maintain 100% visual and behavioral consistency.
 */
export const TaskAssigneeSelector = ({
  selectedAssignees = [],
  onChange,
  error,
  availableMembers,
  label = "Assignees",
  showRoles = true,
  readOnly = false,
}) => {
  return (
    <MemberSelector
      value={selectedAssignees}
      onChange={onChange}
      availableMembers={availableMembers}
      error={error}
      label={label}
      countLabel="selected"
      placeholder="Search team members by name, email, or role to assign..."
      emptyMessage="No team members assigned yet. Search above to assign contributors."
      defaultRole="Contributor"
      showRoles={showRoles}
      readOnly={readOnly}
      transformOnAdd={(user, initialRole) => ({
        id: user.id || user._id,
        _id: user.id || user._id,
        name: user.name || user.user?.name,
        email: user.email || user.user?.email,
        username: user.username || user.user?.username,
        avatar: user.avatar || user.user?.avatar,
        role: user.role || user.jobTitle || "Member",
        projectRole: initialRole,
        projectRoles: [initialRole],
        tags: [initialRole],
      })}
    />
  );
};

export default TaskAssigneeSelector;
