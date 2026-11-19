import React, { useState, useEffect } from 'react';
import { User } from 'lucide-react';

/**
 * Shared UI Component: Avatar
 * Layer: shared/components/ui/
 * Responsibility: Renders user profile picture, or the first letter of the user's name as an avatar fallback.
 * Fallback priority:
 * 1. Valid profile image URL -> Display actual image.
 * 2. User name -> First letter of name in styled container.
 * 3. Email -> First letter of email in styled container.
 * 4. Default -> Standard User icon in styled container.
 */
export const Avatar = ({ src, name = '', email = '', size = 'md', className = '' }) => {
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageError(false);
  }, [src]);

  const sizes = {
    xxs: 'w-5 h-5 text-[9px]',
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const iconSizes = {
    xxs: 10,
    xs: 12,
    sm: 14,
    md: 18,
    lg: 22,
    xl: 28,
  };

  const hasCustomDimension = className.includes('w-') && className.includes('h-');
  const sizeClass = hasCustomDimension
    ? (sizes[size] || sizes.md).replace(/\bw-\S+\s*|\bh-\S+\s*/g, '').trim()
    : (sizes[size] || sizes.md);

  let iconSize = iconSizes[size] || 18;
  if (className.includes('w-5') || className.includes('h-5')) iconSize = 10;
  else if (className.includes('w-6') || className.includes('h-6')) iconSize = 12;
  else if (className.includes('w-7') || className.includes('h-7')) iconSize = 13;
  else if (className.includes('w-8') || className.includes('h-8')) iconSize = 14;
  else if (className.includes('w-9') || className.includes('h-9')) iconSize = 16;

  const altText = (name && name.trim()) || (email && email.trim()) || 'User';
  const titleText = altText;

  const hasValidSrc = typeof src === 'string' && src.trim().length > 0 && !imageError;

  const cleanClassName = className.replace(/\binline-block\b/g, '').trim();

  if (hasValidSrc) {
    return (
      <img
        src={src.trim()}
        alt={altText}
        onError={() => setImageError(true)}
        className={`rounded-full object-cover shrink-0 inline-block ${sizeClass} ${cleanClassName}`}
      />
    );
  }

  const hasName = typeof name === 'string' && name.trim().length > 0;
  const hasEmail = typeof email === 'string' && email.trim().length > 0;

  let fallbackContent = null;
  if (hasName) {
    fallbackContent = name.trim().charAt(0).toUpperCase();
  } else if (hasEmail) {
    fallbackContent = email.trim().charAt(0).toUpperCase();
  } else {
    fallbackContent = <User size={iconSize} className="shrink-0" />;
  }

  return (
    <div
      className={`rounded-full bg-indigo-100 text-primary font-bold inline-flex items-center justify-center shrink-0 select-none leading-none ${
        sizeClass
      } ${cleanClassName}`}
      title={titleText}
    >
      {fallbackContent}
    </div>
  );
};

export default Avatar;
