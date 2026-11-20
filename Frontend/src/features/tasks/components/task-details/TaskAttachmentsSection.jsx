import React, { useState } from "react";
import {
  Paperclip,
  Plus,
  Image as ImageIcon,
  FileText,
  Eye,
  ExternalLink,
  Download,
  Trash2,
  Loader2,
} from "lucide-react";
import { Button } from "../../../../shared/components/ui/Button.jsx";
import { TaskAttachmentsUploader } from "../TaskAttachmentsUploader.jsx";
import {
  formatFileSize,
  isImageFile,
  getDocumentBadge,
} from "../../utils/attachmentHelpers.js";

/**
 * Feature Subcomponent: TaskAttachmentsSection
 * Layer: features/tasks/components/task-details/
 * Responsibility: Task attachments section in Task Details modal/page.
 * - Default View Mode: Read-only presentation of attached files with preview and download actions.
 * - Edit Mode: Allows uploading new attachments and deleting existing ones.
 */
export const TaskAttachmentsSection = ({
  taskId,
  attachments = [],
  isEditing = false,
  canAttachFiles = false,
  canRemoveAttachment,
  onAttachmentsChange,
  onRemoveAttachment,
  onPreview,
  removingAttachmentId = null,
}) => {
  const [isUploaderOpen, setIsUploaderOpen] = useState(false);

  const handleDownload = async (fileUrl, fileName, e) => {
    e?.stopPropagation?.();
    if (!fileUrl) return;

    try {
      const response = await fetch(fileUrl);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName || "attachment";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      // Direct navigation fallback if blob fetch blocked by CORS
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName || "attachment";
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="space-y-3 p-4 rounded-2xl bg-slate-50/60 border border-slate-100">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Paperclip size={15} className="text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
            Attachments ({attachments.length})
          </span>
        </div>

        {/* Upload toggle only visible in edit mode */}
        {isEditing && canAttachFiles && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsUploaderOpen((prev) => !prev)}
            className="!px-2 !py-1 text-xs font-bold text-primary hover:text-primary-hover hover:bg-indigo-50"
          >
            <Plus size={13} className="mr-1" />
            <span>
              {isUploaderOpen ? "Close Uploader" : "Add Attachments"}
            </span>
          </Button>
        )}
      </div>

      {/* Inline Attachment Uploader only in edit mode */}
      {isEditing && isUploaderOpen && (
        <div className="p-3.5 bg-white rounded-2xl border border-indigo-100 shadow-xs animate-in fade-in duration-150">
          <TaskAttachmentsUploader
            taskId={taskId}
            attachments={attachments}
            onChange={onAttachmentsChange}
          />
        </div>
      )}

      {/* Attachments Cards Grid */}
      {attachments.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {attachments.map((file, idx) => {
            const fileName = file.fileName || file.name || "Attachment";
            const fileUrl = file.fileUrl || file.url || "";
            const fileId = file.fileId || file._id || file.id || `att-${idx}`;
            const isImage = isImageFile(
              fileName,
              file.mimeType || file.fileType
            );
            const badge = getDocumentBadge(fileName);
            const formattedSize =
              file.size ||
              (file.fileSize ? formatFileSize(file.fileSize) : "");
            const isRemoving = removingAttachmentId === fileId;
            const canRemove = isEditing && canRemoveAttachment?.(file);

            return (
              <div
                key={fileId}
                className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200/90 bg-white hover:border-indigo-200 hover:shadow-xs transition-all group"
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {/* Thumbnail / File Icon */}
                  {isImage && (file.thumbnailUrl || fileUrl) ? (
                    <div
                      className="relative cursor-pointer group/thumb shrink-0"
                      onClick={() => onPreview?.(fileUrl || file.thumbnailUrl)}
                      title="Click to view full preview"
                    >
                      <img
                        src={file.thumbnailUrl || fileUrl}
                        alt={fileName}
                        className="w-10 h-10 rounded-lg object-cover ring-1 ring-slate-200"
                        onError={(e) => {
                          e.target.style.display = "none";
                          if (e.target.nextSibling) {
                            e.target.nextSibling.style.display = "flex";
                          }
                        }}
                      />
                      <div className="hidden w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 items-center justify-center">
                        <ImageIcon size={18} />
                      </div>
                      <div className="absolute inset-0 bg-slate-900/40 rounded-lg opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center text-white transition-opacity">
                        <Eye size={13} />
                      </div>
                    </div>
                  ) : (
                    <div
                      className={`w-10 h-10 rounded-lg border flex items-center justify-center shrink-0 ${badge.bg}`}
                    >
                      <FileText size={18} className={badge.iconColor} />
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-xs font-bold text-slate-800 truncate"
                      title={fileName}
                    >
                      {fileName}
                    </p>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5">
                      <span className="font-semibold text-slate-500 uppercase">
                        {badge.label}
                      </span>
                      {formattedSize && (
                        <>
                          <span>•</span>
                          <span>{formattedSize}</span>
                        </>
                      )}
                      {file.uploadedBy?.name && (
                        <>
                          <span>•</span>
                          <span className="truncate">
                            by {file.uploadedBy.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions: View & Download always; Delete only in edit mode */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  {fileUrl ? (
                    <>
                      <a
                        href={fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-primary hover:bg-indigo-50 transition-colors"
                        title="Open attachment in new tab"
                        aria-label={`Open ${fileName}`}
                      >
                        <ExternalLink size={13} />
                      </a>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleDownload(fileUrl, fileName, e)}
                        className="!p-1.5 text-slate-400 hover:text-primary hover:bg-indigo-50"
                        title={`Download ${fileName}`}
                        aria-label={`Download ${fileName}`}
                      >
                        <Download size={13} />
                      </Button>
                    </>
                  ) : (
                    <span
                      className="text-[10px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
                      title="File URL is currently unavailable"
                    >
                      No URL
                    </span>
                  )}

                  {canRemove && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => onRemoveAttachment?.(file, e)}
                      disabled={isRemoving}
                      className="!p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 disabled:opacity-50"
                      title={`Remove ${fileName}`}
                      aria-label={`Remove ${fileName}`}
                    >
                      {isRemoving ? (
                        <Loader2
                          size={13}
                          className="animate-spin text-rose-500"
                        />
                      ) : (
                        <Trash2 size={13} />
                      )}
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 bg-white rounded-xl text-center border border-dashed border-slate-200">
          <p className="text-xs text-slate-400 font-medium">
            No attachments uploaded for this task.
          </p>
        </div>
      )}
    </div>
  );
};

export default TaskAttachmentsSection;
