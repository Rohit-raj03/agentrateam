import React from "react";
import { Users } from "lucide-react";
import { MemberSelector } from "../../../../shared/components/ui/MemberSelector.jsx";
import { Avatar } from "../../../../shared/components/ui/Avatar.jsx";

/**
 * Feature Subcomponent: TaskAssigneeSection
 * Layer: features/tasks/components/task-details/
 * Responsibility: Task assignee section in Task Details modal/page.
 * - Default View Mode: Read-only presentation of assigned team members with avatars and roles.
 * - Edit Mode: Interactive MemberSelector for assigning or removing contributors.
 */
export const TaskAssigneeSection = ({
  assignees = [],
  effectiveMembers = [],
  isEditing = false,
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

  // 1. Read-Only View Mode (Default)
  if (!isEditing) {
    return (
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users size={15} className="text-primary" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Assigned Employees ({assignees.length})
            </span>
            <span className="text-[10px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md">
              Team
            </span>
          </div>
        </div>

        {assignees.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {assignees.map((member, idx) => {
              const memId =
                member.id ||
                member._id ||
                member.user?._id ||
                member.user ||
                `mem-${idx}`;
              const name = member.name || member.user?.name || "Member";
              const username = member.username || member.user?.username || "";
              const role =
                member.role ||
                member.projectRole ||
                member.title ||
                "Contributor";
              const avatar = member.avatar || member.user?.avatar;

              return (
                <div
                  key={memId}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/80 border border-slate-100"
                >
                  <Avatar
                    src={avatar}
                    name={name}
                    size="sm"
                    className="ring-1 ring-slate-200 shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {name}
                    </p>
                    {username && (
                      <p className="text-[11px] text-slate-400 truncate">
                        @{username}
                      </p>
                    )}
                  </div>
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 text-primary border border-indigo-100 shrink-0">
                    {role}
                  </span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-3.5 bg-slate-50 rounded-xl text-center border border-dashed border-slate-200">
            <p className="text-xs text-slate-400 font-medium">
              No employees assigned to this task.
            </p>
          </div>
        )}
      </div>
    );
  }

  // 2. Edit Mode (Interactive MemberSelector)
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
