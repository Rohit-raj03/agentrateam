import React from "react";

/**
 * Shared UI Component: Card
 * Layer: shared/components/ui/
 * Responsibility: Reusable container with OCTOM design system styling (white background, rounded-3xl corners, soft ambient shadow, subtle border).
 */
export const Card = ({ children, className = "", hover = false, ...props }) => {
  return (
    <div
      className={`bg-white rounded-3xl p-6 border border-slate-100 shadow-card ${
        hover
          ? "hover:border-indigo-100 hover:shadow-card-hover transition-all"
          : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export default Card;
