import { useCallback, useEffect } from 'react';
import { socket } from '../services/socket';
import { toast } from '../lib/notifications';
import { dialog } from '../lib/dialog';
import { useAuth } from './useAuth';

interface UseModerationOptions {
  onMessageDeleted?: (messageId: string) => void;
  onUserBanned?: (userId: string) => void;
}

export const useModeration = (options?: UseModerationOptions) => {
  const { user } = useAuth();
  const { onMessageDeleted, onUserBanned } = options || {};

  useEffect(() => {
    const handleModerationSuccess = (data: { action: string; message: string; messageId?: string }) => {
      toast.success(data.message);

      if (data.action === 'delete' && data.messageId && onMessageDeleted) {
        onMessageDeleted(data.messageId);
      }
    };

    const handleModerationError = (data: { code: string; message: string; messageId?: string }) => {
      toast.error(data.message);
    };

    const handleUserBanned = (data: { platform: string; targetUserId: string; action: string }) => {
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

  const deleteMessage = useCallback((messageId: string, platform: string, platformIds?: Record<string, string>) => {
    if (!user?.id) {
      toast.error('Debes estar autenticado');
      return;
    }

    if (onMessageDeleted) {
      onMessageDeleted(messageId);
    }

    socket.emit('moderation_action', {
      userId: user.id,
      platform,
      action: 'delete',
      messageId,
      platformIds
    });
  }, [user, onMessageDeleted]);

  const banUser = useCallback(async (targetUserId: string, targetUsername: string, platform: string) => {
    if (!user?.id) {
      toast.error('Debes estar autenticado');
      return;
    }

    const confirmed = await dialog.danger(
      `¿Estás seguro de banear a ${targetUsername}?`,
      {
        title: 'Confirmar baneo',
        confirmText: 'Sí',
        cancelText: 'No'
      }
    );

    if (!confirmed) {
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
    const event = new CustomEvent('reply_to_user', { detail: { username } });
    window.dispatchEvent(event);
  }, []);

  return {
    deleteMessage,
    banUser,
    replyToUser
  };
};