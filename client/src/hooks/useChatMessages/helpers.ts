import type { ChatMessage } from '../../types';

export const generateTempId = (): string => {
  return `temp-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
};
export const ensureMessageId = (message: ChatMessage): ChatMessage => {
  if (message.id) {
    return message;
  }
  return {
    ...message,
    id: generateTempId()
  };
};
