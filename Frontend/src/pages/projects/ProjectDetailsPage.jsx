import React, { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  ArrowLeft,
  FolderKanban,
  Plus,
  Edit3,
  ChevronRight,
  Trash2,
} from "lucide-react";

import { Badge } from "../../shared/components/ui/Badge.jsx";
import { Button } from "../../shared/components/ui/Button.jsx";
import { Modal } from "../../shared/components/ui/Modal.jsx";
import { ProjectMembers } from "../../features/projects/components/ProjectMembers.jsx";
import { ProjectTaskList } from "../../features/projects/components/ProjectTaskList.jsx";

import { CreateProjectModal } from "../../features/projects/components/CreateProjectModal.jsx";
import { DeleteProjectModal } from "../../features/projects/components/DeleteProjectModal.jsx";
import { CreateTaskModal } from "../../features/tasks/components/CreateTaskModal.jsx";
import { TaskDetails } from "../../features/tasks/components/TaskDetails.jsx";
import { useProjects } from "../../features/projects/hooks/useProjects.js";
import { useTasks } from "../../features/tasks/hooks/useTasks.js";
import { useAuth } from "../../features/auth/hooks/useAuth.js";

import { formatDate } from "../../shared/utils/formatDate.js";
import { ROUTES } from "../../shared/constants/routes.js";

/**
 * Presentation Layer: ProjectDetailsPage
 * Layer: pages/projects/
 * Responsibility: Complete workspace view for a single project showcasing tagged members, connected tasks, progress metrics, and task creation.
 */
export const ProjectDetailsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const {
    getProjectById,
    getProjectTasks,
    tagMemberToProject,
    untagMemberFromProject,
    updateMemberRole,
    updateProject,
    deleteProject,
  } = useProjects();
  const { addTask } = useTasks();

  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isEditProjectOpen, setIsEditProjectOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingProject, setIsDeletingProject] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);

  const project = getProjectById(id);
  const projectTasks = getProjectTasks(id);

  const { user: currentUser } = useAuth();
  const currentUserId = (currentUser?._id || currentUser?.id)?.toString();
  const isPlatformAdmin = currentUser?.role?.toLowerCase() === "admin";
  const isProjectOwnerOrAdmin = Boolean(
    isPlatformAdmin ||
      (currentUserId &&
        ((project?.owner?._id || project?.owner)?.toString() === currentUserId ||
          (project?.manager?._id || project?.manager)?.toString() === currentUserId ||
          project?.members?.some(
            (m) =>
              (m.id?.toString() === currentUserId ||
                m._id?.toString() === currentUserId ||
                (m.user?._id || m.user?.id || m.user)?.toString() === currentUserId) &&
              ((m.role || "").toLowerCase() === "owner" || (m.role || "").toLowerCase() === "admin")
          )))
  );

  const isProjectOwner = Boolean(
    isPlatformAdmin ||
      (currentUserId &&
        ((project?.owner?._id || project?.owner)?.toString() === currentUserId ||
          (project?.manager?._id || project?.manager)?.toString() === currentUserId ||
          project?.members?.some(
            (m) =>
              (m.id?.toString() === currentUserId ||
                m._id?.toString() === currentUserId ||
                (m.user?._id || m.user?.id || m.user)?.toString() === currentUserId) &&
              (m.role || "").toLowerCase() === "owner"
          )))
  );

  const isProjectViewer = Boolean(
    !isPlatformAdmin &&
      !isProjectOwnerOrAdmin &&
      currentUserId &&
      project?.members?.some(
        (m) =>
          (m.id?.toString() === currentUserId ||
            m._id?.toString() === currentUserId ||
            (m.user?._id || m.user?.id || m.user)?.toString() === currentUserId) &&
          (m.role || "").toLowerCase() === "viewer"
      )
  );

  const isAuthorizedMember = Boolean(
    isPlatformAdmin ||
      (currentUserId &&
        ((project?.owner?._id || project?.owner)?.toString() === currentUserId ||
          (project?.manager?._id || project?.manager)?.toString() === currentUserId ||
          project?.members?.some(
            (m) =>
              m.id?.toString() === currentUserId ||
              m._id?.toString() === currentUserId ||
              (m.user?._id || m.user?.id || m.user)?.toString() === currentUserId
          )))
  );

  const canManageProject = isProjectOwnerOrAdmin;
  const canDeleteProject = isProjectOwner;
  const canAddTask = isAuthorizedMember && !isProjectViewer;

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-3xl bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
          <FolderKanban size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800">Project Not Found</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          The requested project "{id}" could not be located or has been archived.
        </p>
        <Link
          to={ROUTES.PROJECTS}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-2xl bg-primary text-white text-xs font-bold hover:bg-primary-hover transition-colors"
        >
          <ArrowLeft size={14} />
          <span>Back to Projects</span>
        </Link>
      </div>
    );
  }

  const handleCreateTask = async (taskData) => {
    await addTask({
      ...taskData,
      projectId: project.id || project._id,
      projectName: project.name,
    });
    setIsCreateTaskOpen(false);
  };

  const handleEditProject = async (data) => {
    await updateProject(project.id, data);
    setIsEditProjectOpen(false);
  };

  const handleConfirmDeleteProject = async (reason) => {
    setIsDeletingProject(true);
    try {
      await deleteProject(project.id, reason);
      setIsDeleteModalOpen(false);
      navigate(ROUTES.PROJECTS);
    } catch (err) {
      // Handled by delete toast
    } finally {
      setIsDeletingProject(false);
    }
  };

  const completedTasksCount = projectTasks.filter(
    (t) => t.status === "COMPLETED" || t.status === "Done"
  ).length;
  const progressPercent =
    projectTasks.length > 0
      ? Math.round((completedTasksCount / projectTasks.length) * 100)
      : 0;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* 1. Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-medium text-slate-400">
        <Link
          to={ROUTES.PROJECTS}
          className="hover:text-slate-700 transition-colors flex items-center gap-1.5"
        >
          <ArrowLeft size={13} />
          <span>Projects</span>
        </Link>
        <ChevronRight size={13} className="text-slate-300" />
        <span className="text-slate-700 font-semibold">{project.name}</span>
      </nav>

      {/* 2. Project Hero Card */}
      <div className="p-6 md:p-8 bg-white rounded-3xl border border-slate-100/90 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-md"
              style={{ backgroundColor: project.color || "#4361EE" }}
            >
              <FolderKanban size={28} />
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {project.category || "Initiative"}
                </span>
                <Badge
                  variant={project.status === "ACTIVE" ? "success" : "default"}
                >
                  {project.status?.replace("_", " ")}
                </Badge>
                {project.priority && (
                  <Badge
                    variant={
                      project.priority === "URGENT" ? "danger" : "warning"
                    }
                  >
                    {project.priority} Priority
                  </Badge>
                )}
              </div>

              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {project.name}
              </h1>

              <p className="text-xs text-slate-500 max-w-2xl leading-relaxed">
                {project.description ||
                  "No detailed scope description provided."}
              </p>
            </div>
          </div>

          {/* Action Triggers: Edit, Delete, Add Task */}
          <div className="flex items-center gap-2.5 shrink-0">
            {canManageProject && (
              <button
                onClick={() => setIsEditProjectOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Edit project scope and information"
              >
                <Edit3 size={14} />
                <span>Edit</span>
              </button>
            )}
            {canDeleteProject && (
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="p-2 rounded-2xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all shadow-xs cursor-pointer"
                title="Delete project"
              >
                <Trash2 size={15} />
              </button>
            )}
            {canAddTask && (
              <Button
                onClick={() => setIsCreateTaskOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-primary hover:bg-primary-hover active:scale-98 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all cursor-pointer"
              >
                <Plus size={16} />
                <span>Add Task</span>
              </Button>
            )}
          </div>
        </div>

        {/* Metric Badges & Timeline */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-6 border-t border-slate-100 text-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Timeline Start
            </span>
            <span className="font-semibold text-slate-700 mt-0.5 block">
              {project.startDate
                ? formatDate(project.startDate)
                : "Not specified"}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Target Deadline
            </span>
            <span className="font-semibold text-slate-700 mt-0.5 block">
              {project.endDate ? formatDate(project.endDate) : "Open-ended"}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Task Execution
            </span>
            <span className="font-semibold text-slate-700 mt-0.5 block">
              {completedTasksCount} of {projectTasks.length} Completed
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Overall Progress
            </span>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="font-bold text-slate-800 text-[11px]">
                {progressPercent}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section 1: Team Members Tagged to this Project */}
      <div className="p-6 md:p-8 bg-white rounded-3xl border border-slate-100/90 shadow-sm">
        <ProjectMembers
          members={project.members || []}
          projectId={project.id || project._id}
          canManage={canManageProject}
          onTagMember={(member, projectRole, role, tags) =>
            tagMemberToProject(
              project.id || project._id,
              member,
              projectRole,
              role,
              tags
            )
          }
          onUntagMember={(memberId) =>
            untagMemberFromProject(project.id, memberId)
          }
          onUpdateMemberRole={(memberId, role, projectRole, tags) =>
            updateMemberRole(project.id, memberId, role, projectRole, tags)
          }
        />
      </div>

      {/* 4. Section 2: Connected Tasks for this Project */}
      <div className="p-6 md:p-8 bg-white rounded-3xl border border-slate-100/90 shadow-sm">
        <ProjectTaskList
          tasks={projectTasks}
          projectName={project.name}
          onTaskClick={(task) => setSelectedTask(task)}
          onAddTask={canAddTask ? () => setIsCreateTaskOpen(true) : undefined}
        />
      </div>

      {/* 5. Create Task Modal Pre-Connected to this Project */}
      <CreateTaskModal
        isOpen={isCreateTaskOpen}
        onClose={() => setIsCreateTaskOpen(false)}
        onSubmit={handleCreateTask}
        initialData={{
          projectId: project.id,
          projectName: project.name,
        }}
      />

      {/* 6. Edit Project Modal */}
      <CreateProjectModal
        isOpen={isEditProjectOpen}
        onClose={() => setIsEditProjectOpen(false)}
        onSubmit={handleEditProject}
        initialData={project}
        mode="edit"
      />

      {/* 7. Task Details Modal */}
      <Modal
        isOpen={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title="Task Overview"
        maxWidth="max-w-2xl"
      >
        <TaskDetails
          task={selectedTask}
          taskId={selectedTask?.id || selectedTask?._id}
          onUpdate={(updated) => setSelectedTask(updated)}
          onDelete={() => setSelectedTask(null)}
          onClose={() => setSelectedTask(null)}
        />
      </Modal>

      {/* 8. Delete Project Modal */}
      <DeleteProjectModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDeleteProject}
        projectName={project.name}
        isDeleting={isDeletingProject}
      />
    </div>
  );
};

export default ProjectDetailsPage;
