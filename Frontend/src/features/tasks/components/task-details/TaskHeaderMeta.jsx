import React from "react";
import { FolderKanban, Edit2, Trash2 } from "lucide-react";
import { Badge } from "../../../../shared/components/ui/Badge.jsx";
import { Avatar } from "../../../../shared/components/ui/Avatar.jsx";
import { Button } from "../../../../shared/components/ui/Button.jsx";
import { formatDate } from "../../../../shared/utils/formatDate.js";
import {
  getStatusBadgeVariant,
  getPriorityBadgeVariant,
} from "../../utils/taskHelpers.js";
import { MentionRenderer } from "../MentionRenderer.jsx";

/**
 * Feature Subcomponent: TaskHeaderMeta
 * Layer: features/tasks/components/task-details/
 * Responsibility: Header and core metadata (status, priority, title, description, dates, creator).
 * - Default View Mode: 100% read-only display with static badges and clean typography.
 * - Clicking "Edit" invokes onOpenEditModal to open the full task edit form with pre-populated data.
 */
export const TaskHeaderMeta = ({
  task,
  project,
  canManageTask = false,
  onOpenEditModal,
  onStartEdit,
  onOpenDeleteModal,
}) => {
  const projectName =
    task?.projectName ||
    project?.name ||
    (typeof task?.project === "object" ? task?.project?.name : null);

  const isIndividual =
    task?.isIndividual ||
    (!task?.project && !task?.projectId && !project) ||
    projectName === "Individual Task";

  const handleEdit = onOpenEditModal || onStartEdit;

  return (
    <div className="space-y-6">
      {/* 1. Top Static Badges & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          {/* Static Status Badge (Read-Only) */}
          <Badge variant={getStatusBadgeVariant(task.status)}>
            <span>{task.status?.replace("_", " ") || "TO DO"}</span>
          </Badge>

          {/* Static Priority Badge (Read-Only) */}
          <Badge variant={getPriorityBadgeVariant(task.priority)}>
            <span>{task.priority} Priority</span>
          </Badge>
        </div>

        {/* Action Buttons: Edit and Delete (if authorized) */}
        {canManageTask && (
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleEdit}
              className="!px-3 !py-1.5 text-xs font-bold text-primary hover:text-primary-hover hover:bg-indigo-50 border-indigo-100 shadow-2xs"
            >
              <Edit2 size={13} className="mr-1.5" />
              <span>Edit</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onOpenDeleteModal}
              className="!px-3 !py-1.5 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-100/70 shadow-2xs"
              title="Delete task with mandatory reason"
            >
              <Trash2 size={13} className="mr-1.5" />
              <span>Delete</span>
            </Button>
          </div>
        )}
      </div>

      {/* 2. Title & Description (Read-Only Display) */}
      <div className="space-y-1">
        {/* Contextual Project Subtitle Label directly above the task title */}
        {isIndividual ? (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
            <span>Self / Individual Task</span>
          </div>
        ) : (
          projectName && (
            <div className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 tracking-wide">
              <FolderKanban size={13} className="text-primary/80 shrink-0" />
              <span className="truncate">{projectName}</span>
            </div>
          )
        )}

        <h2 className="text-xl font-bold text-slate-900 leading-snug tracking-tight">
          {task.title}
        </h2>

        <div className="text-xs text-slate-600 pt-1 leading-relaxed whitespace-pre-line">
          {task.description ? (
            <MentionRenderer text={task.description} />
          ) : (
            <span className="text-slate-400 italic">No detailed description provided.</span>
          )}
        </div>
      </div>

      {/* 3. Meta Grid: Dates & Estimation (Read-Only) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Start Date
          </span>
          <span className="font-semibold text-slate-700 mt-0.5 block">
            {task.startDate ? formatDate(task.startDate) : "Not specified"}
          </span>
        </div>

        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Due Date
          </span>
          <span className="font-semibold text-slate-700 mt-0.5 block">
            {task.dueDate ? formatDate(task.dueDate) : "No deadline"}
          </span>
        </div>

        <div>
          <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Estimated Time
          </span>
          <span className="font-semibold text-primary mt-0.5 block">
            {task.estimatedTime || "8h"}
          </span>
        </div>
      </div>

      {/* 4. Task Creator (Read-Only) */}
      <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar
            src={task.creator?.avatar}
            name={task.creator?.name || "Task Creator"}
            size="sm"
            className="ring-1 ring-slate-200"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-800">
                {task.creator?.name || "Unknown Creator"}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-purple-50 text-purple-700 border border-purple-100">
                Creator
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Created on {formatDate(task.createdAt || task.startDate)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TaskHeaderMeta;
