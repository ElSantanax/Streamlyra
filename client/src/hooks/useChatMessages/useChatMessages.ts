import { useChatStore } from '../../store/useChatStore';

/**
 * Hook para gestionar los mensajes del chat.
 * Ahora es un proxy delgado hacia useChatStore para mantener compatibilidad
 * con los componentes existentes mientras se beneficia del rendimiento de Zustand.
 */
export const useChatMessages = () => {
  const {
    messages,
    addMessage,
    updateMessageStatus,
    removeMessage,
    removeMessagesByUserId,
    clearMessagesByPlatform,
    clearMessages
  } = useChatStore();

  return {
    messages,
    addMessage,
    updateMessageStatus,
    removeMessage,
    removeMessagesByUserId,
    clearMessagesByPlatform,
    clearMessages,
  };
};