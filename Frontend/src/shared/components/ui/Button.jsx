import React from 'react';

/**
 * Shared Button Component
 * Highly flexible: preserves default variants and sizes, while allowing
 * custom `className` properties (such as rounded-2xl, px-5, py-2.5, font-bold, text-xs)
 * to smoothly take full precedence without style collisions.
 */
export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  onClick,
  type = 'button',
  ...props
}) => {
  const custom = className || '';

  // Detect if caller provided custom overrides in className
  const hasCustomRadius = /\brounded(-\w+)?\b/.test(custom);
  const hasCustomPadding = /\b(p[xye-]?-\d+|p-\d+)\b/.test(custom);
  const hasCustomTextSize = /\btext-(xs|sm|base|lg|xl|2xl)\b/.test(custom);
  const hasCustomFontWeight = /\bfont-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black)\b/.test(custom);
  const hasCustomShadow = /\bshadow(-\w+)?\b/.test(custom);
  const hasCustomBg = /\bbg-\S+/.test(custom);

  // Base classes: only inject defaults if not overridden
  const baseClasses = [
    'inline-flex items-center justify-center transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
    !hasCustomFontWeight && 'font-medium',
    !hasCustomRadius && 'rounded-xl',
  ].filter(Boolean).join(' ');

  const variants = {
    primary: [
      !hasCustomBg && 'bg-primary text-white hover:bg-primary-hover focus:ring-primary',
      !hasCustomShadow && 'shadow-sm',
    ].filter(Boolean).join(' '),
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 focus:ring-slate-300',
    danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500',
    ghost: 'text-slate-600 hover:bg-slate-100 focus:ring-slate-300',
  };

  const sizes = {
    sm: [!hasCustomPadding && 'px-3 py-1.5', !hasCustomTextSize && 'text-xs'].filter(Boolean).join(' '),
    md: [!hasCustomPadding && 'px-4 py-2', !hasCustomTextSize && 'text-sm'].filter(Boolean).join(' '),
    lg: [!hasCustomPadding && 'px-5 py-2.5', !hasCustomTextSize && 'text-base'].filter(Boolean).join(' '),
  };

  const appliedVariant = variants[variant] || variants.primary;
  const appliedSize = sizes[size] || sizes.md;

  const finalClassName = [baseClasses, appliedVariant, appliedSize, custom].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={finalClassName}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
