import React, { useEffect, useState, useRef, useCallback } from "react";

import {
  Calendar,
  Clock,
  FolderKanban,
  FileText,
  AlertCircle,
  Check,
  Bold,
  Italic,
  Code,
  List,
  Link as LinkIcon,
  MessageSquare,
  Loader2,
} from "lucide-react";
import {
  TASK_STATUS,
  TASK_PRIORITY,
} from "../../../shared/constants/taskStatus.js";
import { TaskAssigneeSelector } from "./TaskAssigneeSelector.jsx";
import { TaskPrioritySelector } from "./TaskPrioritySelector.jsx";
import { TaskStatusSelector } from "./TaskStatusSelector.jsx";
import { TaskSubtasksList } from "./TaskSubtasksList.jsx";
import { TaskAttachmentsUploader } from "./TaskAttachmentsUploader.jsx";
import { TaskTagsInput } from "./TaskTagsInput.jsx";
import { MentionTextarea } from "./MentionTextarea.jsx";
import { useProjects } from "../../projects/hooks/useProjects.js";
import { useTeam } from "../../team/hooks/useTeam.js";
import { useAuth } from "../../auth/hooks/useAuth.js";
import { taskService } from "../services/task.service.js";
import { formatDateForInput } from "../../../shared/utils/formatDate.js";
import { Avatar } from "../../../shared/components/ui/Avatar.jsx";
import { Button } from "../../../shared/components/ui/Button.jsx";
import { sanitizeSubtasks } from "../utils/taskHelpers.js";

const ESTIMATION_PRESETS = ["2h", "4h", "1d", "2d", "3d", "1w"];

const resolveInitialFormData = (init, isEdit) => {
  const pId =
    init?.projectId ||
    (typeof init?.project === "string" ? init.project : null) ||
    init?.project?._id ||
    init?.project?.id ||
    "";

  return {
    title: init?.title || "",
    description: init?.description || "",
    projectId: pId,
    priority: init?.priority || TASK_PRIORITY.MEDIUM,
    status: init?.status || TASK_STATUS.TODO,
    startDate:
      formatDateForInput(init?.startDate) ||
      (isEdit ? "" : formatDateForInput(new Date())),
    dueDate:
      formatDateForInput(init?.dueDate) ||
      (isEdit
        ? ""
        : formatDateForInput(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000))),
    estimatedTime: init?.estimatedTime || "8h",
    assignees: Array.isArray(init?.assignees)
      ? init.assignees.map((a) =>
          typeof a === "object" ? { ...a, id: a.id || a._id } : { id: a },
        )
      : [],
    tags: Array.isArray(init?.tags) ? init.tags : [],
    subtasks: Array.isArray(init?.subtasks) ? init.subtasks : [],
    attachments: Array.isArray(init?.attachments) ? init.attachments : [],
    comment: init?.comment || "",
  };
};

/**
 * Feature Component: CreateTaskForm
 * Layer: features/tasks/components/
 * Responsibility: Comprehensive task creation and editing form implementing full metadata,
 * prefilling, assignee multi-select, schedule timeline dates, checklist, file attachments, and validation states.
 */
export const CreateTaskForm = ({
  initialData = {},
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode,
  isModal = true,
}) => {
  const isEditMode =
    mode === "edit" || Boolean(initialData.id || initialData._id);
  const { allProjects } = useProjects();
  const { members: allTeamMembers } = useTeam();
  const availableProjects = allProjects || [];

  const { user: currentUser } = useAuth();
  const currentUserId = (currentUser?._id || currentUser?.id)?.toString();
  const isPlatformAdmin = currentUser?.role?.toLowerCase() === "admin";

  const taskCreatorId = (
    initialData?.creator?._id ||
    initialData?.creator?.id ||
    initialData?.creator
  )?.toString();
  const isTaskCreator = Boolean(
    currentUserId && taskCreatorId && currentUserId === taskCreatorId,
  );

  const initialProjectId = (
    initialData?.projectId ||
    (typeof initialData?.project === "string" ? initialData.project : null) ||
    initialData?.project?._id ||
    initialData?.project?.id ||
    ""
  )?.toString();

  const initialProject = availableProjects.find(
    (p) => (p.id || p._id)?.toString() === initialProjectId,
  );

  const isCurrentProjectManager = Boolean(
    initialProject &&
    currentUserId &&
    ((initialProject.owner?._id || initialProject.owner)?.toString() ===
      currentUserId ||
      (initialProject.manager?._id || initialProject.manager)?.toString() ===
        currentUserId ||
      initialProject.members?.some(
        (m) =>
          (m.id?.toString() === currentUserId ||
            m._id?.toString() === currentUserId ||
            (m.user?._id || m.user?.id || m.user)?.toString() ===
              currentUserId) &&
          ((m.role || "").toLowerCase() === "owner" ||
            (m.role || "").toLowerCase() === "admin"),
      )),
  );

  const canReassignProject =
    !isEditMode || isPlatformAdmin || isTaskCreator || isCurrentProjectManager;

  const [formData, setFormData] = useState(() =>
    resolveInitialFormData(initialData, isEditMode),
  );

  const [serverError, setServerError] = useState("");
  const [internalSubmitting, setInternalSubmitting] = useState(false);
  const submitting = isSubmitting || internalSubmitting;

  // Track if task is successfully saved to prevent cleanup on unmount
  const isSavedRef = useRef(false);
  const currentAttachmentsRef = useRef(formData.attachments);
  const sessionUploadedFileIdsRef = useRef(new Set());
  const cleanedUpFileIdsRef = useRef(new Set());

  useEffect(() => {
    currentAttachmentsRef.current = formData.attachments;
    const initialFileIds = new Set(
      (initialData?.attachments || [])
        .map((a) => a.fileId || a._id || a.id)
        .filter(Boolean),
    );
    (formData.attachments || []).forEach((att) => {
      if (att.fileId && !initialFileIds.has(att.fileId)) {
        sessionUploadedFileIdsRef.current.add(att.fileId);
      }
    });
  }, [formData.attachments, initialData?.attachments]);

  // Clean up any files uploaded during this session from ImageKit if task creation is cancelled / not saved
  const deleteSessionUploadedFiles = useCallback(() => {
    if (isSavedRef.current) return;
    const initialFileIds = new Set(
      (initialData?.attachments || [])
        .map((a) => a.fileId || a._id || a.id)
        .filter(Boolean),
    );
    const toDelete = new Set([
      ...Array.from(sessionUploadedFileIdsRef.current),
      ...(currentAttachmentsRef.current || [])
        .map((a) => a.fileId)
        .filter((fId) => fId && !initialFileIds.has(fId)),
    ]);

    for (const fId of toDelete) {
      if (fId && !cleanedUpFileIdsRef.current.has(fId)) {
        cleanedUpFileIdsRef.current.add(fId);
        taskService.deleteImageKitFile(fId).catch(() => {});
      }
    }
  }, [initialData?.attachments]);

  const deleteSessionUploadedFilesRef = useRef(deleteSessionUploadedFiles);
  useEffect(() => {
    deleteSessionUploadedFilesRef.current = deleteSessionUploadedFiles;
  }, [deleteSessionUploadedFiles]);

  // Execute cleanup on unmount if creation is cancelled (X button, backdrop, Escape, cancel button, or navigating away)
  useEffect(() => {
    return () => {
      if (!isSavedRef.current) {
        deleteSessionUploadedFilesRef.current?.();
      }
    };
  }, []);

  useEffect(() => {
    if (
      initialData &&
      (initialData.id || initialData._id || initialData.title)
    ) {
      setFormData(resolveInitialFormData(initialData, isEditMode));
      setServerError("");
    }
  }, [initialData, isEditMode]);

  const selectedProject = availableProjects.find(
    (p) => (p.id || p._id) === formData.projectId,
  );
  // If project is selected and has members, use those; otherwise allow tagging/assigning from all team members
  const projectMembers =
    selectedProject?.members && selectedProject.members.length > 0
      ? selectedProject.members
      : allTeamMembers || [];

  const [errors, setErrors] = useState({});

  // Validate form fields
  const validate = () => {
    const newErrors = {};
    if (!formData.title.trim()) {
      newErrors.title = "Task title is required.";
    } else if (formData.title.trim().length < 3) {
      newErrors.title = "Task title must be at least 3 characters.";
    }

    if (formData.startDate && formData.dueDate) {
      if (new Date(formData.dueDate) < new Date(formData.startDate)) {
        newErrors.dueDate = "Due date cannot be before start date.";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setServerError("");
    if (!validate()) return;

    if (onSubmit) {
      setInternalSubmitting(true);
      try {
        const effectiveProjectId = canReassignProject
          ? formData.projectId || null
          : initialProjectId || null;
        const selectedProj = availableProjects.find(
          (p) => (p.id || p._id) === effectiveProjectId,
        );
        const submissionData = {
          ...formData,
          subtasks: sanitizeSubtasks(formData.subtasks),
          projectId: effectiveProjectId,
          projectName: selectedProj ? selectedProj.name : "Individual Task",
          isIndividual: !effectiveProjectId,
          // For backwards compatibility with single assignedTo:
          assignedTo:
            formData.assignees.length > 0
              ? formData.assignees
                  .map((a) => a.name || a.username || "Member")
                  .join(", ")
              : "Unassigned",
        };

        isSavedRef.current = true;
        await onSubmit(submissionData);
      } catch (err) {
        console.error("Task submission error:", err);
        setServerError(
          err.response?.data?.message ||
            err.message ||
            "Failed to save task. Please verify your permissions and input.",
        );
      } finally {
        setInternalSubmitting(false);
      }
    }
  };

  const handleCancel = async () => {
    isSavedRef.current = false;
    // Delete all files uploaded in this session from ImageKit
    deleteSessionUploadedFiles();
    onCancel?.();
  };

  const applyTimePreset = (preset) => {
    setFormData((prev) => ({ ...prev, estimatedTime: preset }));
  };

  const formContent = (
    <>
      {/* Server Error Banner */}
      {serverError && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle size={16} className="text-rose-500 shrink-0" />
          <span>{serverError}</span>
        </div>
      )}

      {/* Global Validation Banner */}
      {Object.keys(errors).length > 0 && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle size={16} className="text-rose-500 shrink-0" />
          <span>
            Please correct the errors highlighted below before submitting.
          </span>
        </div>
      )}

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Core Task Content & Documentation (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Task Title (Primary Hero Field) */}
          <div className="p-4 rounded-3xl bg-linear-to-b from-indigo-50/40 to-white border border-indigo-100 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
                  Primary Task
                </span>
                <label
                  htmlFor="task-title"
                  className="block text-xs font-bold uppercase tracking-wider text-slate-800"
                >
                  Task Title <span className="text-rose-500">*</span>
                </label>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {formData.title.length}/100
              </span>
            </div>
            <input
              id="task-title"
              type="text"
              maxLength={100}
              placeholder="e.g. Implement Figma design for AgentraTeam project dashboard"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (errors.title) setErrors({ ...errors, title: null });
              }}
              className={`w-full px-4 py-3 rounded-2xl border text-sm font-medium transition-all ${
                errors.title
                  ? "border-rose-400 focus:ring-2 focus:ring-rose-200 bg-rose-50/20 text-rose-900"
                  : "border-slate-200 focus:ring-2 focus:ring-primary focus:border-transparent bg-white text-slate-900"
              } placeholder-slate-400 shadow-xs`}
            />
            {errors.title && (
              <p className="text-xs text-rose-500 font-medium">
                {errors.title}
              </p>
            )}
          </div>

          {/* Task Description with Rich Toolbar Styling */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label
                htmlFor="task-description-input"
                className="block text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Description & Acceptance Criteria
              </label>
              <div className="flex items-center gap-1 text-slate-400">
                <FileText size={13} />
                <span className="text-[11px]">Markdown supported</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-xs focus-within:ring-2 focus-within:ring-primary focus-within:border-transparent transition-all">
              {/* Toolbar */}
              <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 bg-slate-50/70 text-slate-600">
                <button
                  type="button"
                  title="Bold"
                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                >
                  <Bold size={13} />
                </button>
                <button
                  type="button"
                  title="Italic"
                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                >
                  <Italic size={13} />
                </button>
                <button
                  type="button"
                  title="Code snippet"
                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                >
                  <Code size={13} />
                </button>
                <span className="w-px h-3.5 bg-slate-200 mx-1" />
                <button
                  type="button"
                  title="Bullet list"
                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                >
                  <List size={13} />
                </button>
                <button
                  type="button"
                  title="Insert link"
                  className="p-1 hover:bg-slate-200 rounded transition-colors"
                >
                  <LinkIcon size={13} />
                </button>
              </div>

              {/* Mention-supported Textarea */}
              <div className="p-2">
                <MentionTextarea
                  id="task-description-input"
                  rows={5}
                  placeholder="Describe the objective, user story, acceptance criteria, or type @ to mention project team members..."
                  value={formData.description}
                  onChange={(val) =>
                    setFormData({ ...formData, description: val })
                  }
                  projectMembers={projectMembers}
                  className="w-full text-xs text-slate-800 placeholder-slate-400 bg-transparent border-0 focus:ring-0 leading-relaxed"
                />
              </div>
            </div>
          </div>

          {/* Subtasks (Checklist) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <TaskSubtasksList
              subtasks={formData.subtasks}
              onChange={(newSubtasks) =>
                setFormData({ ...formData, subtasks: newSubtasks })
              }
            />
          </div>

          {/* Attachments Dropzone */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <TaskAttachmentsUploader
              attachments={formData.attachments}
              onChange={(newAttachments) =>
                setFormData({ ...formData, attachments: newAttachments })
              }
              disabled={submitting}
            />
          </div>

          {/* Handover Note / Initial Comment */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <MessageSquare size={14} className="text-slate-500" />
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Initial Comment / Handover Note (Optional)
              </label>
            </div>
            <MentionTextarea
              rows={2}
              placeholder="Leave an introductory note or type @ to ping team members on creation..."
              value={formData.comment}
              onChange={(val) => setFormData({ ...formData, comment: val })}
              projectMembers={projectMembers}
              className="w-full text-xs"
            />
          </div>
        </div>

        {/* Right Column: Metadata, Assignees, Dates & Configuration (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Project Selection */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <FolderKanban size={14} className="text-slate-500" />
              <label
                htmlFor="task-project-select"
                className="text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Project / Context
              </label>
              <span className="text-[10px] text-slate-400 font-normal">
                (Optional - Default is Individual)
              </span>
            </div>
            <select
              id="task-project-select"
              value={formData.projectId}
              disabled={!canReassignProject}
              onChange={(e) => {
                if (!canReassignProject) return;
                const newProjectId = e.target.value;
                const newProj = availableProjects.find(
                  (p) => (p.id || p._id) === newProjectId,
                );
                const allowedMemberIds =
                  newProj?.members && newProj.members.length > 0
                    ? new Set(
                        newProj.members.map((m) =>
                          (m.id || m._id || m.user?._id || m.user)?.toString(),
                        ),
                      )
                    : null;
                setFormData((prev) => ({
                  ...prev,
                  projectId: newProjectId,
                  assignees: allowedMemberIds
                    ? prev.assignees.filter((a) =>
                        allowedMemberIds.has(
                          (a.id || a._id || a.user?._id || a.user)?.toString(),
                        ),
                      )
                    : prev.assignees,
                }));
              }}
              className={`w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold shadow-xs ${
                !canReassignProject
                  ? "bg-slate-100 text-slate-500 cursor-not-allowed"
                  : "bg-white text-slate-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
              }`}
            >
              <option value="">No Project (Individual / Self Task)</option>
              {availableProjects.map((project) => (
                <option
                  key={project.id || project._id}
                  value={project.id || project._id}
                >
                  {project.name}{" "}
                  {project.category ? `(${project.category})` : ""}
                </option>
              ))}
            </select>
            {!canReassignProject && (
              <p className="text-[11px] text-amber-600 font-medium pt-0.5">
                Only the task creator, project manager, or an administrator can
                reassign this task to another project.
              </p>
            )}

            {/* Display Tagged Members in Selected Project OR Individual Task note */}
            {formData.projectId
              ? (() => {
                  const currentProj = availableProjects.find(
                    (p) => (p.id || p._id) === formData.projectId,
                  );
                  if (!currentProj?.members || currentProj.members.length === 0)
                    return null;
                  return (
                    <div className="flex items-center gap-1.5 pt-1 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-400">
                        Tagged in project:
                      </span>
                      <div className="flex items-center -space-x-1.5">
                        {currentProj.members.slice(0, 4).map((m, index) => {
                          const memberUser =
                            m?.user && typeof m.user === "object" ? m.user : {};
                          const name = m?.name || memberUser.name || "";
                          const avatar = m?.avatar || memberUser.avatar || null;
                          const email = m?.email || memberUser.email || "";
                          const key =
                            m?.id ||
                            m?._id ||
                            memberUser.id ||
                            memberUser._id ||
                            `cpm-${index}`;

                          return (
                            <Avatar
                              key={key}
                              src={avatar}
                              name={name}
                              email={email}
                              size="xxs"
                              className="w-5 h-5 ring-1 ring-white"
                            />
                          );
                        })}
                      </div>
                      <span className="text-[10px] text-slate-400 font-medium">
                        ({currentProj.members.length} contributors)
                      </span>
                    </div>
                  );
                })()
              : ""}
          </div>

          {/* Status Selector */}
          <TaskStatusSelector
            value={formData.status}
            onChange={(newStatus) =>
              setFormData({ ...formData, status: newStatus })
            }
          />

          {/* Priority Selector */}
          <TaskPrioritySelector
            value={formData.priority}
            onChange={(newPriority) =>
              setFormData({ ...formData, priority: newPriority })
            }
          />

          {/* Assignee Multi-Selector with Project Members */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <TaskAssigneeSelector
              selectedAssignees={formData.assignees}
              availableMembers={
                projectMembers.length > 0 ? projectMembers : undefined
              }
              onChange={(newAssignees) =>
                setFormData({ ...formData, assignees: newAssignees })
              }
            />
          </div>

          {/* Dates & Timeline (Start Date & Due Date) */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-1.5">
              <Calendar size={14} className="text-slate-500" />
              <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                Schedule & Timeline
              </label>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label
                  htmlFor="task-start-date"
                  className="block text-[11px] font-semibold text-slate-500 mb-1"
                >
                  Start Date
                </label>
                <input
                  id="task-start-date"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div>
                <label
                  htmlFor="task-due-date"
                  className="block text-[11px] font-semibold text-slate-500 mb-1"
                >
                  Due Date <span className="text-rose-500">*</span>
                </label>
                <input
                  id="task-due-date"
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => {
                    setFormData({ ...formData, dueDate: e.target.value });
                    if (errors.dueDate) setErrors({ ...errors, dueDate: null });
                  }}
                  className={`w-full px-3 py-2 rounded-xl border text-xs bg-white text-slate-800 focus:outline-none focus:ring-2 ${
                    errors.dueDate
                      ? "border-rose-400 focus:ring-rose-200"
                      : "border-slate-200 focus:ring-primary"
                  }`}
                />
              </div>
            </div>
            {errors.dueDate && (
              <p className="text-[11px] text-rose-500 font-medium">
                {errors.dueDate}
              </p>
            )}
          </div>

          {/* Estimated Time */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-slate-500" />
                <label
                  htmlFor="task-estimated-time"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700"
                >
                  Estimated Time
                </label>
              </div>
              <span className="text-xs font-bold text-primary">
                {formData.estimatedTime}
              </span>
            </div>

            <input
              id="task-estimated-time"
              type="text"
              placeholder="e.g. 12h or 3d"
              value={formData.estimatedTime}
              onChange={(e) =>
                setFormData({ ...formData, estimatedTime: e.target.value })
              }
              className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white placeholder-slate-400 text-slate-800 focus:outline-none focus:ring-2 focus:ring-primary"
            />

            {/* Quick Estimation Pills */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-400 font-medium">
                Presets:
              </span>
              {ESTIMATION_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => applyTimePreset(preset)}
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-lg transition-colors ${
                    formData.estimatedTime === preset
                      ? "bg-primary text-white shadow-xs"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Tags */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <TaskTagsInput
              tags={formData.tags}
              onChange={(newTags) =>
                setFormData({ ...formData, tags: newTags })
              }
              projectColor={
                selectedProject?.themeColor || selectedProject?.color
              }
              projectId={formData.projectId}
            />
          </div>
        </div>
      </div>
    </>
  );

  const actionButtons = (
    <>
      {onCancel && (
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
          disabled={submitting}
          className="w-full sm:w-auto !px-6 !py-2.5 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 border-slate-200"
        >
          Cancel
        </Button>
      )}

      <Button
        type="submit"
        variant="primary"
        disabled={submitting}
        className="w-full sm:w-auto !px-8 !py-2.5 rounded-2xl text-xs font-bold shadow-md shadow-indigo-200 flex items-center justify-center gap-2"
      >
        {submitting ? (
          <>
            <Loader2 size={15} className="animate-spin mr-1" />
            <span>{isEditMode ? "Updating Task..." : "Creating Task..."}</span>
          </>
        ) : (
          <>
            <Check size={15} strokeWidth={2.5} className="mr-1" />
            <span>{isEditMode ? "Update Task" : "Create Task"}</span>
          </>
        )}
      </Button>
    </>
  );

  if (isModal) {
    return (
      <form
        onSubmit={handleSubmit}
        className="flex flex-col flex-1 min-h-0 h-full overflow-hidden"
      >
        <div className="flex-1 min-h-0 overflow-y-auto px-5 sm:px-6 py-4 sm:py-5 space-y-6 overscroll-contain">
          {formContent}
        </div>
        <div className="shrink-0 px-6 py-3.5 sm:py-4 bg-white border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3 z-10 shadow-[0_-4px_16px_rgba(0,0,0,0.03)]">
          {actionButtons}
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {formContent}
      <div className="pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
        {actionButtons}
      </div>
    </form>
  );
};
