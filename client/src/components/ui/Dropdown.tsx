/**
 * Dropdown Component - Menú desplegable reutilizable
 * Usado para: menús de usuario, opciones, selectores
 */

import { useRef, useEffect, type ReactNode, type ButtonHTMLAttributes } from 'react';

interface DropdownProps {
  isOpen: boolean;
  onClose: () => void;
  trigger: ReactNode;
  children: ReactNode;
  align?: 'left' | 'right';
  width?: string;
}

export const Dropdown = ({
  isOpen,
  onClose,
  trigger,
  children,
  align = 'right',
  width = 'w-64',
}: DropdownProps) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  return (
    <div className="relative" ref={dropdownRef}>
      {trigger}

      {isOpen && (
        <div
          className={`
            absolute ${align === 'right' ? 'right-0' : 'left-0'} mt-2 ${width}
            bg-card-dark border border-surface-border rounded-xl shadow-2xl py-2 z-50
            animate-in fade-in zoom-in duration-200 origin-top-${align}
          `}
        >
          {children}
        </div>
      )}
    </div>
  );
};

interface DropdownItemProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  children: ReactNode;
  variant?: 'default' | 'danger';
}

export const DropdownItem = ({
  icon,
  children,
  variant = 'default',
  ...buttonProps
}: DropdownItemProps) => {
  const variantStyles = {
    default: 'text-gray-400 hover:text-white hover:bg-white/5',
    danger: 'text-red-400 hover:text-red-300 hover:bg-red-400/5',
  };

  return (
    <button
      {...buttonProps}
      className={`
        w-full px-4 py-2.5 flex items-center gap-3 transition-colors text-sm font-medium cursor-pointer
        disabled:opacity-50 disabled:cursor-not-allowed
        ${variantStyles[variant]}
      `}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

interface DropdownDividerProps {
  className?: string;
}

export const DropdownDivider = ({ className = '' }: DropdownDividerProps) => {
  return <div className={`my-2 border-t border-surface-border mx-4 ${className}`} />;
};
