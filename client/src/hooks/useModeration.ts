import { useCallback } from 'react';
import { toast } from '../lib/notifications';
import { useAuth } from './useAuth';
import { useChatStore } from '../store/useChatStore';

/**
 * Hook para acciones de moderación.
 * Ahora delega la ejecución y el seguimiento del estado al useChatStore.
 */
export const useModeration = () => {
  const { user } = useAuth();
  const { deleteMessage: storeDelete, banUser: storeBan } = useChatStore();

  const deleteMessage = useCallback((messageId: string, platform: string, platformIds?: Record<string, string>) => {
    if (!user?.id) {
      toast.error('Debes estar autenticado');
      return;
    }

    storeDelete(messageId, platform, user.id, platformIds);
  }, [user, storeDelete]);

  const banUser = useCallback(async (targetUserId: string, targetUsername: string, platform: string) => {
    if (!user?.id) {
      toast.error('Debes estar autenticado');
      return;
    }

    await storeBan(targetUserId, targetUsername, platform, user.id);
  }, [user, storeBan]);

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