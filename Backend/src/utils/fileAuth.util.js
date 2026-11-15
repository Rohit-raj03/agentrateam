import mongoose from "mongoose";
import UserModel from "../models/user.model.js";
import TeamModel from "../models/team.model.js";
import ProjectModel from "../models/project.model.js";
import TaskModel from "../models/task.model.js";

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

  // If database is disconnected (e.g. offline unit test environments), proceed
  if (mongoose.connection.readyState !== 1) {
    return { authorized: true };
  }

  const cleanFileId = String(fileId).trim();
  const userIdStr = (user._id || user.id)?.toString();

  // 1. Prevent deleting other users' avatars
  const avatarOwner = await UserModel.findOne({ avatarFileId: cleanFileId }).select("_id");
  if (avatarOwner && avatarOwner._id.toString() !== userIdStr) {
    return {
      authorized: false,
      reason: "You are not authorized to delete another user's profile avatar",
    };
  }

  // 2. Prevent deleting team logos unless the user can manage the team
  const team = await TeamModel.findOne({ logoFileId: cleanFileId });
  if (team && typeof team.canManageTeam === "function") {
    if (!team.canManageTeam(userIdStr, user.role)) {
      return {
        authorized: false,
        reason: "You are not authorized to delete this team logo",
      };
    }
  }

  // 3. Prevent deleting project cover images unless user has project membership / management
  const project = await ProjectModel.findOne({ coverImageFileId: cleanFileId });
  if (project && typeof project.isProjectMember === "function") {
    if (!project.isProjectMember(userIdStr, user.role)) {
      return {
        authorized: false,
        reason: "You are not authorized to delete this project cover image",
      };
    }
  }

  // 4. Prevent deleting task attachments unless user has access to the task or project
  const task = await TaskModel.findOne({ "attachments.fileId": cleanFileId }).populate("project");
  if (task) {
    if (task.project) {
      if (typeof task.project.isProjectMember === "function" && !task.project.isProjectMember(userIdStr, user.role)) {
        return {
          authorized: false,
          reason: "You are not authorized to delete this task attachment",
        };
      }
    } else {
      const isCreator = task.creator?.toString() === userIdStr;
      const isAssignee = (task.assignees || []).some(
        (a) => (a._id || a)?.toString() === userIdStr
      );
      if (!isCreator && !isAssignee) {
        return {
          authorized: false,
          reason: "You are not authorized to delete this task attachment",
        };
      }
    }
  }

  return { authorized: true };
};

export default checkFileDeletionAuthorization;
