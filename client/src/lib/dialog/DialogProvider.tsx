/**
 * DialogProvider - Proveedor global para el sistema de diálogos
 * Debe envolver la aplicación en App.tsx
 */

import { useEffect, useState } from 'react';
import { Dialog } from '../../components/ui/Dialog';
import { dialog, type DialogState } from './dialog.service';

export const DialogProvider = () => {
  const [state, setState] = useState<DialogState | null>(null);

  useEffect(() => {
    const unsubscribe = dialog.subscribe(setState);
    return () => {
      unsubscribe();
    };
  }, []);

  if (!state) return null;

  return (
    <Dialog
      isOpen={state.isOpen}
      onClose={(result) => dialog.close(result)}
      type={state.type}
      variant={state.variant}
      title={state.title}
      message={state.message}
      confirmText={state.confirmText}
      cancelText={state.cancelText}
      placeholder={state.placeholder}
      defaultValue={state.defaultValue}
    />
  );
};
