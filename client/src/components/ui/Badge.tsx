/**
 * Badge Component - Indicadores de estado reutilizables
 * Usado para: conexión, online/offline, contadores, etc.
 */

import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral';
type BadgeSize = 'xs' | 'sm' | 'md';

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
  withDot?: boolean;
  animated?: boolean;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-green-500/10 border-green-500/20 text-green-500',
  error: 'bg-red-500/10 border-red-500/20 text-red-500',
  warning: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500',
  info: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
  neutral: 'bg-gray-500/10 border-gray-500/20 text-gray-400',
};

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  warning: 'bg-yellow-500',
  info: 'bg-blue-500',
  neutral: 'bg-gray-400',
};

const sizeStyles: Record<BadgeSize, string> = {
  xs: 'text-[9px] px-1.5 py-0.5',
  sm: 'text-[10px] px-2 py-1',
  md: 'text-xs px-2.5 py-1',
};

export const Badge = ({
  variant = 'neutral',
  size = 'sm',
  children,
  withDot = false,
  animated = false,
  className = '',
}: BadgeProps) => {
  return (
    <span
      className={`
        inline-flex items-center gap-1.5 rounded-full border font-black uppercase tracking-wider leading-none
        ${variantStyles[variant]}
        ${sizeStyles[size]}
        ${className}
      `}
    >
      {withDot && (
        <span className="relative flex size-1.5 shrink-0">
          {animated && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: dotColors[variant].replace('bg-', '') }} />
          )}
          <span className={`relative inline-flex rounded-full size-1.5 ${dotColors[variant]}`} />
        </span>
      )}
      {children}
    </span>
  );
};
