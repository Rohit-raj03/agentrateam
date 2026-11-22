import mongoose from "mongoose";

/**
 * Centralized RBAC and ABAC Authorization Policy Service
 * Centralizes access control rules across projects and tasks.
 */

/**
 * Helper to determine if a project reference is a populated project document/object
 * rather than an unpopulated ObjectId or string ID.
 */
export const isPopulatedProject = (p) => {
  if (!p || typeof p !== "object") return false;
  if (p instanceof mongoose.Types.ObjectId) return false;
  if (mongoose.isObjectIdOrHexString(p)) return false;
  return Boolean(
    p.name ||
    p.members ||
    p.owner ||
    p.manager ||
    typeof p.isProjectMember === "function" ||
    typeof p.canManageProject === "function"
  );
};

/**
 * Checks if a user is authorized to view a project.
 * - Platform admins can view any project.
 * - Project owners, managers, and authorized project members can view the project.
 * - Non-member users (including system managers and members not on the roster) cannot view.
 */
export const canViewProject = (project, user) => {
  if (!project || !user) return false;
  if (user.role === "admin") return true;

  const uid = (user._id || user.id)?.toString();
  if (!uid) return false;

  const ownerId = (project.owner?._id || project.owner)?.toString();
  const managerId = (project.manager?._id || project.manager)?.toString();
  if (ownerId === uid || managerId === uid) return true;

  if (Array.isArray(project.members)) {
    const isMember = project.members.some((m) => {
      const mUid = (m.user?._id || m.user?.id || m.user || m._id || m.id)?.toString();
      return mUid === uid;
    });
    if (isMember) return true;
  }

  if (typeof project.isProjectMember === "function") {
    return project.isProjectMember(user._id || user.id, user.role);
  }

  return false;
};

/**
 * Checks if a user is authorized to manage a project (update, delete, member management).
 * - Platform admins can manage any project.
 * - Project owner, project manager, or members with project role 'Owner' or 'Admin'.
 * - Global system managers without project association CANNOT manage other projects.
 */
export const canManageProject = (project, user) => {
  if (!project || !user) return false;
  if (user.role === "admin") return true;

  const uid = (user._id || user.id)?.toString();
  if (!uid) return false;

  const ownerId = (project.owner?._id || project.owner)?.toString();
  const managerId = (project.manager?._id || project.manager)?.toString();
  if (ownerId === uid || managerId === uid) return true;

  if (Array.isArray(project.members)) {
    const member = project.members.find((m) => {
      const mUid = (m.user?._id || m.user?.id || m.user || m._id || m.id)?.toString();
      const mRole = (m.role || "").toLowerCase();
      return mUid === uid && (mRole === "owner" || mRole === "admin");
    });
    if (member) return true;
  }

  if (typeof project.canManageProject === "function") {
    return project.canManageProject(user._id || user.id, user.role);
  }

  return false;
};

/**
 * Checks if a user has the read-only 'Viewer' role within a project.
 * - Platform admins, project owners, and project managers are NEVER viewers.
 */
export const isProjectViewer = (project, user) => {
  if (!project || !user) return false;
  if (user.role === "admin") return false;

  const uid = (user._id || user.id)?.toString();
  if (!uid) return false;

  const ownerId = (project.owner?._id || project.owner)?.toString();
  const managerId = (project.manager?._id || project.manager)?.toString();
  if (ownerId === uid || managerId === uid) return false;

  if (Array.isArray(project.members)) {
    const isOwnerOrAdmin = project.members.some((m) => {
      const mUid = (m.user?._id || m.user?.id || m.user || m._id || m.id)?.toString();
      const mRole = (m.role || "").toLowerCase();
      return mUid === uid && (mRole === "owner" || mRole === "admin");
    });
    if (isOwnerOrAdmin) return false;

    const member = project.members.find((m) => {
      const mUid = (m.user?._id || m.user?.id || m.user || m._id || m.id)?.toString();
      const mRole = (m.role || "").toLowerCase();
      return mUid === uid && mRole === "viewer";
    });
    if (member) return true;
  }

  if (typeof project.isProjectViewer === "function") {
    return project.isProjectViewer(user._id || user.id, user.role);
  }

  return false;
};

/**
 * Checks if a user is authorized to access (read) a task and its attachments/comments.
 * - Platform admins have access to all tasks.
 * - Project tasks: any user who can view the project has access.
 * - Individual tasks or unpopulated project reference: creator or assignees only.
 */
export const canAccessTask = (task, user, project = null) => {
  if (!task || !user) return false;
  if (user.role === "admin") return true;

  const uid = (user._id || user.id)?.toString();
  if (!uid) return false;

  const effectiveProject =
    project || (isPopulatedProject(task?.project) ? task.project : null);

  if (effectiveProject) {
    return canViewProject(effectiveProject, user);
  }

  // Individual task or unpopulated project reference: creator or assignees
  const creatorId = (task.creator?._id || task.creator?.id || task.creator)?.toString();
  if (creatorId === uid) return true;

  if (Array.isArray(task.assignees)) {
    const isAssignee = task.assignees.some((a) => {
      const aUid = (a?._id || a?.id || a)?.toString();
      return aUid === uid;
    });
    if (isAssignee) return true;
  }

  return false;
};

/**
 * Checks if a user is authorized to edit/update a task.
 * - Platform admins can edit any task.
 * - In projects:
 *   - 'Viewer' role is strictly read-only and CANNOT edit tasks.
 *   - Project managers/owners can edit.
 *   - Task creator can edit.
 *   - Task assignees can update the task (e.g., status, progress, comments).
 * - Individual tasks:
 *   - Creator or assignees can edit.
 */
export const canEditTask = (task, user, project = null) => {
  if (!task || !user) return false;
  if (user.role === "admin") return true;

  const uid = (user._id || user.id)?.toString();
  if (!uid) return false;

  const effectiveProject =
    project || (isPopulatedProject(task?.project) ? task.project : null);

  if (effectiveProject) {
    if (!canViewProject(effectiveProject, user)) {
      return false; // Non-members cannot edit project tasks
    }
    if (isProjectViewer(effectiveProject, user)) {
      return false; // Viewers are read-only
    }
    if (canManageProject(effectiveProject, user)) return true;
  }

  const creatorId = (task.creator?._id || task.creator?.id || task.creator)?.toString();
  if (creatorId === uid) return true;

  if (Array.isArray(task.assignees)) {
    const isAssignee = task.assignees.some((a) => {
      const aUid = (a?._id || a?.id || a)?.toString();
      return aUid === uid;
    });
    if (isAssignee) return true;
  }

  return false;
};

/**
 * Checks if a user is authorized to delete a task.
 * - Platform admins can delete any task.
 * - In projects:
 *   - Project managers and project owners can delete tasks.
 *   - Task creator can delete their own task.
 *   - Other members or assignees CANNOT delete someone else's task.
 *   - 'Viewer' role CANNOT delete tasks.
 * - Individual tasks:
 *   - Task creator can delete their task.
 */
export const canDeleteTask = (task, user, project = null) => {
  if (!task || !user) return false;
  if (user.role === "admin") return true;

  const uid = (user._id || user.id)?.toString();
  if (!uid) return false;

  const effectiveProject =
    project || (isPopulatedProject(task?.project) ? task.project : null);

  if (effectiveProject) {
    if (!canViewProject(effectiveProject, user)) {
      return false; // Non-members cannot delete project tasks
    }
    if (isProjectViewer(effectiveProject, user)) {
      return false; // Viewers cannot delete
    }
    if (canManageProject(effectiveProject, user)) return true;
  }

  const creatorId = (task.creator?._id || task.creator?.id || task.creator)?.toString();
  if (creatorId === uid) return true;

  return false;
};

export default {
  isPopulatedProject,
  canViewProject,
  canManageProject,
  isProjectViewer,
  canAccessTask,
  canEditTask,
  canDeleteTask,
};
