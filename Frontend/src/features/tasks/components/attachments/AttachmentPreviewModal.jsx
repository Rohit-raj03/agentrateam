import React, { useState, useEffect } from "react";
import { X, ExternalLink, AlertCircle } from "lucide-react";

export const AttachmentPreviewModal = ({
  previewUrl,
  onClose,
  fileName = "Attachment Preview",
}) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [previewUrl]);

  if (!previewUrl) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl max-h-[90vh] bg-white rounded-2xl overflow-hidden shadow-2xl p-4 flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="w-full flex items-center justify-between pb-3 border-b border-slate-100">
          <span className="text-xs font-bold text-slate-800 truncate max-w-md">
            {fileName}
          </span>
          <div className="flex items-center gap-2">
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg text-slate-500 hover:text-primary hover:bg-indigo-50 transition-colors"
              title="Open full image in new tab"
            >
              <ExternalLink size={16} />
            </a>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-red-500 hover:bg-red-100 transition-colors cursor-pointer"
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center min-h-60 max-h-[75vh] w-full overflow-hidden">
          {hasError ? (
            <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
              <AlertCircle size={32} className="text-amber-500" />
              <p className="text-xs font-semibold text-slate-700">
                Preview unavailable
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs">
                The image could not be loaded or the link has expired.
              </p>
              <a
                href={previewUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-xs font-bold text-primary hover:underline inline-flex items-center gap-1"
              >
                <span>Try opening directly</span>
                <ExternalLink size={12} />
              </a>
            </div>
          ) : (
            <img
              src={previewUrl}
              alt={fileName}
              onError={() => setHasError(true)}
              className="max-h-[75vh] w-auto rounded-xl object-contain mx-auto"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AttachmentPreviewModal;
