import { apiClient } from "../../../shared/api/apiClient.js";
import { sanitizeSubtasks } from "../utils/taskHelpers.js";

export const taskService = {
  getTasks: async (params) => apiClient.get("/tasks", params),
  getProjectTasks: async (projectId, params) =>
    apiClient.get(`/projects/${projectId}/tasks`, params),
  getTaskById: async (id) => apiClient.get(`/tasks/${id}`),
  createTask: async (data) => {
    const payload = data?.subtasks
      ? { ...data, subtasks: sanitizeSubtasks(data.subtasks) }
      : data;
    return apiClient.post("/tasks", payload);
  },
  updateTask: async (id, data) => {
    const payload = data?.subtasks
      ? { ...data, subtasks: sanitizeSubtasks(data.subtasks) }
      : data;
    return apiClient.patch(`/tasks/${id}`, payload);
  },
  deleteTask: async (id, reason) =>
    apiClient.delete(`/tasks/${id}`, typeof reason === "string" ? { reason } : reason),
  toggleSubtask: async (taskId, subtaskId) =>
    apiClient.patch(`/tasks/${taskId}/subtasks/${subtaskId}`),
  getTaskComments: async (taskId) =>
    apiClient.get(`/tasks/${taskId}/comments`),
  createTaskComment: async (taskId, data) =>
    apiClient.post(`/tasks/${taskId}/comments`, data),
  deleteTaskComment: async (taskId, commentId) =>
    apiClient.delete(`/tasks/${taskId}/comments/${commentId}`),
  clearTaskComments: async (taskId) =>
    apiClient.delete(`/tasks/${taskId}/comments`),
  // Task Attachments
  uploadAttachments: async (formData, options = {}) => {
    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      ...(typeof options === "function" ? { onUploadProgress: options } : options),
    };
    return apiClient.post("/tasks/attachments/upload", formData, config);
  },
  attachFilesToTask: async (taskId, formData, options = {}) => {
    const config = {
      headers: {
        "Content-Type": "multipart/form-data",
      },
      ...(typeof options === "function" ? { onUploadProgress: options } : options),
    };
    return apiClient.post(`/tasks/${taskId}/attachments`, formData, config);
  },
  getTaskAttachments: async (taskId) =>
    apiClient.get(`/tasks/${taskId}/attachments`),
  deleteTaskAttachment: async (taskId, attachmentId) =>
    apiClient.delete(`/tasks/${taskId}/attachments/${attachmentId}`),

  deleteImageKitFile: async (fileId) =>
    apiClient.delete(`/imagekit/file/${fileId}`),
};

export default taskService;
