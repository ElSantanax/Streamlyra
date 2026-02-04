/**
 * Dialog Component - Modales personalizados para reemplazar alert/confirm/prompt
 * Tipos: alert, confirm, prompt
 */

import { useEffect, useRef, useState } from 'react';
import { Button } from './Button';

export type DialogType = 'alert' | 'confirm' | 'prompt';
export type DialogVariant = 'info' | 'warning' | 'danger' | 'success';

interface DialogProps {
  isOpen: boolean;
  onClose: (result: boolean | string | null) => void;
  type: DialogType;
  variant?: DialogVariant;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  placeholder?: string;
  defaultValue?: string;
}

export const Dialog = ({
  isOpen,
  onClose,
  type,
  variant = 'info',
  title,
  message,
  confirmText = 'Aceptar',
  cancelText = 'Cancelar',
  placeholder = '',
  defaultValue = '',
}: DialogProps) => {
  const [inputValue, setInputValue] = useState(defaultValue);
  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setInputValue(defaultValue);
      document.body.style.overflow = 'hidden';
      
      // Focus en el input si es prompt
      if (type === 'prompt' && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, defaultValue, type]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleConfirm = () => {
    if (type === 'prompt') {
      onClose(inputValue);
    } else {
      onClose(true);
    }
  };

  const handleCancel = () => {
    if (type === 'alert') {
      onClose(true);
    } else {
      onClose(type === 'prompt' ? null : false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
      handleCancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && type === 'prompt') {
      e.preventDefault();
      handleConfirm();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md bg-card-dark border border-surface-border rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Content */}
        <div className="p-6 text-center">
          {title && (
            <h3 className="text-lg font-bold text-white mb-3">
              {title}
            </h3>
          )}
          <p className="text-sm text-gray-300 leading-relaxed">
            {message}
          </p>

          {/* Input para prompt */}
          {type === 'prompt' && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              className="w-full mt-4 px-3 py-2 bg-input-dark border border-surface-border rounded-lg text-white text-sm placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            />
          )}
        </div>

        {/* Footer con botones */}
        <div className="px-6 py-4 bg-surface-dark/50 border-t border-surface-border flex gap-3 justify-center">
          {type !== 'alert' && (
            <Button
              variant="ghost"
              size="md"
              onClick={handleCancel}
              className="min-w-[100px]"
            >
              {cancelText}
            </Button>
          )}
          <Button
            variant={variant === 'danger' ? 'danger' : 'primary'}
            size="md"
            onClick={handleConfirm}
            className="min-w-[100px]"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
};
