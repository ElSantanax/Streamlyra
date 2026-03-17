import { useChatStore } from '../../store/useChatStore';
import { useShallow } from 'zustand/react/shallow';

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
  } = useChatStore(useShallow(state => ({
    messages: state.messages,
    addMessage: state.addMessage,
    updateMessageStatus: state.updateMessageStatus,
    removeMessage: state.removeMessage,
    removeMessagesByUserId: state.removeMessagesByUserId,
    clearMessagesByPlatform: state.clearMessagesByPlatform,
    clearMessages: state.clearMessages
  })));

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