import React from "react";
import { Clock, AlertCircle } from "lucide-react";

/**
 * Shared alert banner for Login and Registration forms (amber for pending approval, red for errors).
 */
export const AuthFormAlert = ({ message, isPending = false }) => {
  if (!message) return null;

  return (
    <div
      className={`p-3.5 rounded-2xl text-xs sm:text-sm font-medium flex items-start gap-2.5 transition-all ${
        isPending
          ? "bg-amber-50 text-amber-800 border border-amber-200"
          : "bg-red-50 text-red-600 border border-red-200"
      }`}
    >
      {isPending ? (
        <Clock size={18} className="text-amber-600 shrink-0 mt-0.5" />
      ) : (
        <AlertCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
      )}
      <div className="flex-1 leading-snug">
        <p>{message}</p>
      </div>
    </div>
  );
};
