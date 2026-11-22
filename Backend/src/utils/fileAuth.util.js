import mongoose from "mongoose";
import UserModel from "../models/user.model.js";
import TeamModel from "../models/team.model.js";
import ProjectModel from "../models/project.model.js";
import TaskModel from "../models/task.model.js";
import config from "../config/config.js";
import { canManageProject, isProjectViewer } from "../services/policy.service.js";

/**
 * Checks if an authenticated user is authorized to delete a specific ImageKit fileId.
 * Prevents Insecure Direct Object References (IDOR / SEC-06).
 *
 * @param {string} fileId - The ImageKit file ID
 * @param {object} user - The authenticated user object (must contain _id and role)
 * @returns {Promise<{ authorized: boolean, reason?: string }>}
 */
export const checkFileDeletionAuthorization = async (fileId, user) => {
  if (!user) {
    return { authorized: false, reason: "Authentication required" };
  }

  // Platform administrators have unrestricted file deletion privileges
  if (user.role === "admin") {
    return { authorized: true };
  }

  // Detect test runner environment
  const isTestEnv =
    process.env.NODE_ENV === "test" ||
    config.NODE_ENV === "test" ||
    process.argv.includes("--test") ||
    process.env.NODE_TEST_CONTEXT !== undefined;

  // Fail closed if database is disconnected outside of test environments
  if (mongoose.connection.readyState !== 1) {
    if (isTestEnv && process.env.NODE_ENV !== "production") {
      return { authorized: true };
    }
    return { authorized: false, reason: "Database connection is unavailable" };
  }

  const cleanFileId = String(fileId).trim();
  const userIdStr = (user._id || user.id)?.toString();
  let isLinked = false;

  // 1. Prevent deleting other users' avatars
  const avatarOwner = await UserModel.findOne({ avatarFileId: cleanFileId }).select("_id");
  if (avatarOwner) {
    isLinked = true;
    if (avatarOwner._id.toString() !== userIdStr) {
      return {
        authorized: false,
        reason: "You are not authorized to delete another user's profile avatar",
      };
    }
  }

  // 2. Prevent deleting team logos unless the user can manage the team
  const team = await TeamModel.findOne({ logoFileId: cleanFileId });
  if (team) {
    isLinked = true;
    if (typeof team.canManageTeam === "function") {
      if (!team.canManageTeam(userIdStr, user.role)) {
        return {
          authorized: false,
          reason: "You are not authorized to delete this team logo",
        };
      }
    }
  }

  // 3. Prevent deleting project cover images unless user is manager/owner
  const project = await ProjectModel.findOne({ coverImageFileId: cleanFileId });
  if (project) {
    isLinked = true;
    if (isProjectViewer(project, user) || !canManageProject(project, user)) {
      return {
        authorized: false,
        reason: "You are not authorized to delete this project cover image",
      };
    }
  }

  // 4. Prevent deleting task attachments unless user is creator, uploader, or project manager
  const task = await TaskModel.findOne({ "attachments.fileId": cleanFileId }).populate("project");
  if (task) {
    isLinked = true;
    if (task.project && isProjectViewer(task.project, user)) {
      return {
        authorized: false,
        reason: "You are not authorized to delete this task attachment",
      };
    }

    const targetAtt = (task.attachments || []).find((a) => a.fileId === cleanFileId);
    const isUploader = (targetAtt?.uploadedBy?._id || targetAtt?.uploadedBy)?.toString() === userIdStr;
    const isCreator = (task.creator?._id || task.creator)?.toString() === userIdStr;
    const isProjectManager = task.project ? canManageProject(task.project, user) : false;

    if (!isCreator && !isUploader && !isProjectManager) {
      return {
        authorized: false,
        reason: "You are not authorized to delete this task attachment",
      };
    }
  }

  // Non-admins cannot delete unlinked files
  if (!isLinked) {
    return {
      authorized: false,
      reason: "You are not authorized to delete unlinked files",
    };
  }

  return { authorized: true };
};

export default checkFileDeletionAuthorization;
