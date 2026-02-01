/**
 * Hook para acciones de moderación
 */

import { useCallback, useEffect } from 'react';
import { socket } from '../services/socket';
import { toast } from '../lib/notifications';
import { useAuth } from './useAuth';

interface UseModerationOptions {
  onMessageDeleted?: (messageId: string) => void;
  onUserBanned?: (userId: string) => void;
}

export const useModeration = (options?: UseModerationOptions) => {
  const { user } = useAuth();
  const { onMessageDeleted, onUserBanned } = options || {};

  // Escuchar eventos de moderación
  useEffect(() => {
    const handleModerationSuccess = (data: { action: string; message: string; messageId?: string }) => {
      toast.success(data.message);
      
      // Si fue una eliminación exitosa, confirmar la eliminación local
      if (data.action === 'delete' && data.messageId && onMessageDeleted) {
        onMessageDeleted(data.messageId);
      }
    };

    const handleModerationError = (data: { code: string; message: string; messageId?: string }) => {
      toast.error(data.message);
      
      // Si falló la eliminación, el mensaje ya fue eliminado localmente
      // No hacemos nada aquí porque el optimistic update ya ocurrió
    };

    const handleUserBanned = (data: { platform: string; targetUserId: string; action: string }) => {
      // Eliminar todos los mensajes del usuario baneado
      if (data.targetUserId && onUserBanned) {
        onUserBanned(data.targetUserId);
      }
    };

    socket.on('moderation_success', handleModerationSuccess);
    socket.on('moderation_error', handleModerationError);
    socket.on('user_banned', handleUserBanned);

    return () => {
      socket.off('moderation_success', handleModerationSuccess);
      socket.off('moderation_error', handleModerationError);
      socket.off('user_banned', handleUserBanned);
    };
  }, [onMessageDeleted, onUserBanned]);

  const deleteMessage = useCallback((messageId: string, platform: string) => {
    if (!user?.id) {
      toast.error('Debes estar autenticado');
      return;
    }

    // Eliminación optimista: eliminar inmediatamente del UI
    if (onMessageDeleted) {
      onMessageDeleted(messageId);
    }

    // Enviar al servidor en background
    socket.emit('moderation_action', {
      userId: user.id,
      platform,
      action: 'delete',
      messageId
    });
  }, [user, onMessageDeleted]);

  const banUser = useCallback((targetUserId: string, targetUsername: string, platform: string) => {
    if (!user?.id) {
      toast.error('Debes estar autenticado');
      return;
    }

    // Confirmar antes de banear
    if (!window.confirm(`¿Estás seguro de banear a ${targetUsername}?`)) {
      return;
    }

    socket.emit('moderation_action', {
      userId: user.id,
      platform,
      action: 'ban',
      targetUserId,
      reason: 'Baneado desde el dashboard'
    });
  }, [user]);

  const replyToUser = useCallback((username: string) => {
    // Emitir evento personalizado para que ChatInput lo capture
    const event = new CustomEvent('reply_to_user', { detail: { username } });
    window.dispatchEvent(event);
  }, []);

  return {
    deleteMessage,
    banUser,
    replyToUser
  };
};
