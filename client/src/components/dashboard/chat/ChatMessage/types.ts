import type { ChatMessage as ChatMessageData } from '../../../../types/chat.types';
import type { PlatformKey } from '../../../../constants/platforms';

export interface ChatMessageProps extends ChatMessageData {
    onReply?: (username: string) => void;
    onDelete?: (messageId: string, platform: PlatformKey, platformIds?: Record<string, string>) => void;
    onBan?: (userId: string, username: string, platform: PlatformKey) => void;
}
