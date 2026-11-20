import React, { useState, useEffect } from "react";
import { useDispatch } from "react-redux";
import { Loader2 } from "lucide-react";
import { useTasks } from "../hooks/useTasks.js";
import { updateTask as updateTaskAction } from "../store/taskSlice.js";
import { useAuth } from "../../auth/hooks/useAuth.js";
import { taskService } from "../services/task.service.js";
import { useTeam } from "../../team/hooks/useTeam.js";
import { useProjects } from "../../projects/hooks/useProjects.js";
import { TaskComments } from "./TaskComments.jsx";
import { CreateTaskModal } from "./CreateTaskModal.jsx";
import { DeleteTaskModal } from "./DeleteTaskModal.jsx";
import { AttachmentPreviewModal } from "./attachments/AttachmentPreviewModal.jsx";
import { TaskHeaderMeta } from "./task-details/TaskHeaderMeta.jsx";
import { TaskAssigneeSection } from "./task-details/TaskAssigneeSection.jsx";
import { TaskSubtasksSection } from "./task-details/TaskSubtasksSection.jsx";
import { TaskAttachmentsSection } from "./task-details/TaskAttachmentsSection.jsx";
import { TaskMetadataSection } from "./task-details/TaskMetadataSection.jsx";

/**
 * Feature Component: TaskDetails
 * Layer: features/tasks/components/
 * Responsibility: Complete Task Overview component.
 * - Default View Mode: 100% read-only display. Users can only view task details without inline mutation controls.
 * - Edit Mode: Clicking the "Edit" button opens the Create/Update Task modal with all existing task data automatically pre-filled.
 */
export const TaskDetails = ({
  task: initialTask,
  taskId,
  onUpdate,
  onDelete,
  onClose,
  projectMembers: passedMembers,
}) => {
  const dispatch = useDispatch();
  const { allTasks, updateTask, deleteTask } = useTasks();
  const { members: teamMembers } = useTeam();
  const { getProjectById } = useProjects();

  const [loadingTask, setLoadingTask] = useState(false);
  const [fetchedTask, setFetchedTask] = useState(null);

  // Edit & Delete modal states
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Attachment preview lightbox
  const [previewModalUrl, setPreviewModalUrl] = useState(null);

  // Retrieve live reactive task from Redux store or locally fetched fallback
  const currentId = taskId || initialTask?.id || initialTask?._id;
  const reduxTask = allTasks.find(
    (t) => t.id === currentId || t._id === currentId
  );
  const task = reduxTask || fetchedTask || initialTask;

  useEffect(() => {
    if (!task && currentId) {
      setLoadingTask(true);
      taskService
        .getTaskById(currentId)
        .then((res) => {
          const t = res?.task || res?.data || res;
          if (t) {
            setFetchedTask(t);
            dispatch(updateTaskAction(t));
          }
        })
        .catch((err) => {
          console.error("Failed to load task overview:", err);
        })
        .finally(() => {
          setLoadingTask(false);
        });
    }
  }, [currentId, task, dispatch]);

  const project = getProjectById(
    task?.projectId || task?.project?._id || task?.project
  );

  const effectiveMembers =
    passedMembers ||
    (project?.members && project.members.length > 0
      ? project.members.map((m) => ({
          id: m.id || m._id || m.user?._id || m.user,
          _id: m.id || m._id || m.user?._id || m.user,
          name: m.name || m.user?.name || "Member",
          username: m.username || m.user?.username || "",
          avatar: m.avatar || m.user?.avatar,
          role: m.projectRole || m.role || "Member",
        }))
      : teamMembers);

  // Current authenticated user for RBAC permission enforcement
  const { user: currentUser } = useAuth();
  const currentUserId = (currentUser?._id || currentUser?.id)?.toString();
  const creatorId = (
    task?.creator?._id ||
    task?.creator?.id ||
    task?.creator
  )?.toString();
  const isAdmin = currentUser?.role?.toLowerCase() === "admin";
  const isCreator = Boolean(
    currentUserId && creatorId && currentUserId === creatorId
  );
  const isProjectManager = Boolean(
    project &&
      currentUserId &&
      ((project.manager?._id || project.manager)?.toString() === currentUserId ||
        (project.owner?._id || project.owner)?.toString() === currentUserId ||
        project.canManageProject?.(currentUser?._id, currentUser?.role))
  );

  const canManageTask = isAdmin || isCreator || isProjectManager;

  // Task deletion handler
  const handleDeleteConfirm = async (reason) => {
    setIsDeleting(true);
    setDeleteError("");
    try {
      const idToDelete = task.id || task._id || currentId;
      await deleteTask(idToDelete, reason);
      setIsDeleteModalOpen(false);
      onDelete?.(idToDelete);
      onClose?.();
    } catch (err) {
      console.error("Task deletion failed:", err);
      setDeleteError(
        err.response?.data?.message ||
          err.message ||
          "Failed to delete task. You may not have permission to delete this task."
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (loadingTask && !task) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-xs text-slate-500 font-medium">
          Loading task overview...
        </p>
      </div>
    );
  }

  if (!task) return null;

  // Fully resolved initial data for the Create/Update Task modal form
  const resolvedProjectId =
    task?.projectId ||
    task?.project?._id ||
    task?.project?.id ||
    (typeof task?.project === "string" ? task.project : "") ||
    project?.id ||
    project?._id ||
    "";

  const editInitialData = {
    ...task,
    id: task.id || task._id || currentId,
    _id: task._id || task.id || currentId,
    projectId: resolvedProjectId,
    projectName:
      task.projectName ||
      project?.name ||
      (typeof task.project === "object" ? task.project?.name : ""),
    title: task.title || "",
    description: task.description || "",
    status: task.status || "TO_DO",
    priority: task.priority || "MEDIUM",
    startDate: task.startDate || "",
    dueDate: task.dueDate || "",
    estimatedTime: task.estimatedTime || "8h",
    assignees: Array.isArray(task.assignees) ? task.assignees : [],
    subtasks: Array.isArray(task.subtasks) ? task.subtasks : [],
    attachments: Array.isArray(task.attachments) ? task.attachments : [],
    tags: Array.isArray(task.tags) ? task.tags : [],
    comment: task.comment || "",
  };

  return (
    <div className="space-y-6">
      {/* 1. Header with Static Status, Static Priority, Project Name, Title, Dates & Edit/Delete Buttons */}
      <TaskHeaderMeta
        task={task}
        project={project}
        canManageTask={canManageTask}
        onOpenEditModal={() => setIsEditModalOpen(true)}
        onOpenDeleteModal={() => {
          setDeleteError("");
          setIsDeleteModalOpen(true);
        }}
      />

      {/* 2. Employee / Assignees Section (Read-Only) */}
      <TaskAssigneeSection
        assignees={task.assignees || []}
        effectiveMembers={effectiveMembers}
        isEditing={false}
      />

      {/* 3. Subtasks Checklist (Read-Only) */}
      <TaskSubtasksSection
        subtasks={task.subtasks || []}
        isEditing={false}
      />

      {/* 4. Attachments Section (Read-Only with Lightbox Preview & Download) */}
      <TaskAttachmentsSection
        taskId={task.id || task._id || currentId}
        attachments={task.attachments || []}
        isEditing={false}
        canAttachFiles={false}
        onPreview={setPreviewModalUrl}
      />

      {/* 5. Metadata (Tags & Handover Notes) */}
      <TaskMetadataSection
        tags={task.tags || []}
        project={project}
        taskProject={task.project}
        comment={task.comment}
      />

      {/* 6. Comments & Discussion Stream */}
      <TaskComments
        taskId={task.id || task._id || currentId}
        projectMembers={effectiveMembers}
      />

      {/* 7. Full Create/Update Task Modal (Pre-populated automatically on Edit click) */}
      <CreateTaskModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        initialData={editInitialData}
        title="Update Task"
        subtitle="Update overall task details, workflow status, assignees, and checklist."
        onSubmit={async (data) => {
          const updated = {
            ...task,
            ...data,
            id: task.id || task._id || currentId,
            _id: task._id || task.id || currentId,
          };
          const res = await updateTask(updated);
          const finalUpdated = res?.task || res?.data || res || updated;
          setFetchedTask(finalUpdated);
          onUpdate?.(finalUpdated);
          setIsEditModalOpen(false);
        }}
      />

      {/* 8. Delete Task Confirmation Modal */}
      <DeleteTaskModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
            setDeleteError("");
          }
        }}
        onConfirm={handleDeleteConfirm}
        taskTitle={task.title}
        isDeleting={isDeleting}
        apiError={deleteError}
      />

      {/* 9. Lightbox Modal for Image Attachment Previews */}
      <AttachmentPreviewModal
        previewUrl={previewModalUrl}
        onClose={() => setPreviewModalUrl(null)}
      />
    </div>
  );
};

export default TaskDetails;
