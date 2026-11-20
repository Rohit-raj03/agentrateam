import { TASK_STATUS, TASK_PRIORITY } from '../../../shared/constants/taskStatus.js';

export const getStatusBadgeVariant = (status) => {
  switch (status) {
    case TASK_STATUS.COMPLETED:
      return 'success';
    case TASK_STATUS.IN_PROGRESS:
      return 'primary';
    case TASK_STATUS.IN_REVIEW:
      return 'warning';
    default:
      return 'default';
  }
};

export const getPriorityBadgeVariant = (priority) => {
  switch (priority) {
    case TASK_PRIORITY.URGENT:
      return 'danger';
    case TASK_PRIORITY.HIGH:
      return 'warning';
    case TASK_PRIORITY.MEDIUM:
      return 'primary';
    default:
      return 'default';
  }
};

/**
 * Validates whether a given ID string is a valid 24-character hexadecimal MongoDB ObjectId.
 */
export const isValidObjectId = (id) =>
  typeof id === "string" && /^[0-9a-fA-F]{24}$/.test(id);

/**
 * Sanitizes subtasks array before sending to the backend API.
 * Ensures temporary client-side IDs (like 'st-1793787968881') are NEVER sent as `_id`,
 * preventing Mongoose BSONError Cast to ObjectId failure.
 * Valid MongoDB ObjectIds are preserved.
 */
export const sanitizeSubtasks = (subtasks) => {
  if (!Array.isArray(subtasks)) return [];
  return subtasks
    .filter((st) => st && (typeof st === "string" || st.title))
    .map((st) => {
      const title = typeof st === "string" ? st : st.title || "";
      const clean = {
        title: title.trim(),
        completed: Boolean(st.completed),
      };
      const possibleId = st._id || st.id;
      if (possibleId && isValidObjectId(String(possibleId))) {
        clean._id = String(possibleId);
      }
      return clean;
    });
};
