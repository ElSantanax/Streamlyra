import type { ChatMessage as ChatMessageData } from '../../../../types/chat.types';

export interface ChatMessageProps extends ChatMessageData {
    onReply?: (username: string) => void;
    onDelete?: (messageId: string) => void;
    onBan?: (userId: string, username: string) => void;
}
