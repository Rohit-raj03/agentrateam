import React from "react";
import { MemberSelector } from "../../../../shared/components/ui/MemberSelector.jsx";

/**
 * Feature Subcomponent: TaskAssigneeSection
 * Layer: features/tasks/components/task-details/
 * Responsibility: Interactive task assignee section in Task Details modal/page.
 * Reuses canonical MemberSelector component for 100% visual and behavioral consistency.
 */
export const TaskAssigneeSection = ({
  assignees = [],
  effectiveMembers = [],
  onUpdateAssignees,
  onToggleAssignee,
  onRemoveAssignee,
}) => {
  const handleChange = (newAssignees) => {
    if (onUpdateAssignees) {
      onUpdateAssignees(newAssignees);
      return;
    }

    const prevIds = new Set(
      assignees.map((a) => (a.id || a._id || a.user?._id || a.user)?.toString())
    );
    const newIds = new Set(
      newAssignees.map((a) => (a.id || a._id || a.user?._id || a.user)?.toString())
    );

    // Any newly added?
    newAssignees.forEach((member) => {
      const id = (member.id || member._id || member.user?._id || member.user)?.toString();
      if (!prevIds.has(id)) {
        onToggleAssignee?.(member);
      }
    });

    // Any removed?
    assignees.forEach((member) => {
      const id = (member.id || member._id || member.user?._id || member.user)?.toString();
      if (!newIds.has(id)) {
        onRemoveAssignee?.(member.id || member._id);
      }
    });
  };

  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
      <MemberSelector
        value={assignees}
        onChange={handleChange}
        availableMembers={effectiveMembers}
        label="Assigned Employees"
        countLabel="assigned"
        placeholder="Search employees by name, email, or role to assign..."
        emptyMessage="No employees assigned to this task. Search above to assign contributors."
        defaultRole="Contributor"
        showRoles={true}
      />
    </div>
  );
};

export default TaskAssigneeSection;
