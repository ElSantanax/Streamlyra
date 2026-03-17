import { create } from 'zustand';
import { socket } from '../services/socket';
import { toast } from '../lib/notifications';
import { dialog } from '../lib/dialog';
import type { ChatMessage, MessageStatus } from '../types';
import { ensureMessageId } from '../hooks/useChatMessages/helpers';

const MAX_MESSAGES = 1000;
const FLUSH_INTERVAL_MS = 300;

interface ChatState {
    messages: ChatMessage[];
    pendingMessages: ChatMessage[];
    flushTimeout: ReturnType<typeof setTimeout> | null;

    addMessage: (message: ChatMessage) => void;
    flushMessages: () => void;
    updateMessageStatus: (
        messageId: string,
        status: MessageStatus,
        errorMessage?: string,
        platformIds?: Record<string, string>
    ) => void;
    removeMessage: (messageId: string) => void;
    removeMessagesByUserId: (userId: string) => void;
    clearMessagesByPlatform: (platform: string) => void;
    clearMessages: () => void;

    deleteMessage: (messageId: string, platform: string, userId: string, platformIds?: Record<string, string>) => void;
    banUser: (targetUserId: string, targetUsername: string, platform: string, userId: string) => Promise<void>;

    initSocket: () => void;
}

const mergeMessages = (current: ChatMessage[], incoming: ChatMessage[]) => {
    if (incoming.length === 0) return current;

    const existingIds = new Set(current.map(m => `${m.id}:${m.platform}`));
    const uniqueNew: ChatMessage[] = [];
    const batchIds = new Set<string>();

    for (const msg of incoming) {
        if (!msg.id) {
            uniqueNew.push(msg);
            continue;
        }
        const compositeId = `${msg.id}:${msg.platform}`;
        if (existingIds.has(compositeId) || batchIds.has(compositeId)) continue;

        uniqueNew.push(msg);
        batchIds.add(compositeId);
    }

    if (uniqueNew.length === 0) return current;

    const nextData = [...current, ...uniqueNew];

    const CHUNK_SIZE = 100;
    const LIMIT = MAX_MESSAGES + CHUNK_SIZE;

    if (nextData.length > LIMIT) {
        const excessCount = nextData.length - MAX_MESSAGES;
        return nextData.slice(excessCount);
    }

    return nextData;
};

export const useChatStore = create<ChatState>((set, get) => ({
    messages: [],
    pendingMessages: [],
    flushTimeout: null,

    addMessage: (message) => {
        const messageWithId = ensureMessageId(message);
        set(state => ({
            pendingMessages: [...state.pendingMessages, messageWithId]
        }));

        if (!get().flushTimeout) {
            const timeout = setTimeout(() => get().flushMessages(), FLUSH_INTERVAL_MS);
            set({ flushTimeout: timeout });
        }
    },

    flushMessages: () => {
        const state = get();
        if (state.flushTimeout) clearTimeout(state.flushTimeout);

        const pending = [...state.pendingMessages];
        if (pending.length === 0) {
            set({ flushTimeout: null });
            return;
        }

        set(prev => ({
            messages: mergeMessages(prev.messages, pending),
            pendingMessages: [],
            flushTimeout: null
        }));
    },

    updateMessageStatus: (messageId, status, errorMessage, platformIds) => {
        const state = get();
        const pending = [...state.pendingMessages];

        set(prev => {
            const currentMessages = pending.length > 0
                ? mergeMessages(prev.messages, pending)
                : prev.messages;

            return {
                messages: currentMessages.map(msg =>
                    msg.id === messageId
                        ? { ...msg, status, errorMessage, platformIds }
                        : msg
                ),
                pendingMessages: [],
                flushTimeout: null
            };
        });
    },

    removeMessage: (messageId) => {
        const state = get();
        const pending = [...state.pendingMessages];

        set(prev => {
            const currentMessages = pending.length > 0
                ? mergeMessages(prev.messages, pending)
                : prev.messages;

            return {
                messages: currentMessages.filter(msg => msg.id !== messageId),
                pendingMessages: [],
                flushTimeout: null
            };
        });
    },

    removeMessagesByUserId: (userId) => {
        const state = get();
        const pending = [...state.pendingMessages];

        set(prev => {
            const currentMessages = pending.length > 0
                ? mergeMessages(prev.messages, pending)
                : prev.messages;

            return {
                messages: currentMessages.filter(msg => msg.userId !== userId),
                pendingMessages: [],
                flushTimeout: null
            };
        });
    },

    clearMessagesByPlatform: (platform) => {
        const state = get();
        const pending = [...state.pendingMessages];

        set(prev => {
            const currentMessages = pending.length > 0
                ? mergeMessages(prev.messages, pending)
                : prev.messages;

            return {
                messages: currentMessages.filter(msg => msg.platform !== platform),
                pendingMessages: [],
                flushTimeout: null
            };
        });
    },

    clearMessages: () => {
        const state = get();
        if (state.flushTimeout) clearTimeout(state.flushTimeout);
        set({
            messages: [],
            pendingMessages: [],
            flushTimeout: null
        });
    },

    deleteMessage: (messageId, platform, userId, platformIds) => {
        get().removeMessage(messageId);

        socket.emit('moderation_action', {
            userId,
            platform,
            action: 'delete',
            messageId,
            platformIds
        });
    },

    banUser: async (targetUserId, targetUsername, platform, userId) => {
        const confirmed = await dialog.danger(
            `\u00bfEst\u00e1s seguro de banear a ${targetUsername}?`,
            {
                title: 'Confirmar baneo',
                confirmText: 'S\u00ed',
                cancelText: 'No'
            }
        );

        if (!confirmed) return;

        get().removeMessagesByUserId(targetUserId);

        socket.emit('moderation_action', {
            userId,
            platform,
            action: 'ban',
            targetUserId,
            reason: 'Baneado desde el dashboard'
        });
    },

    initSocket: () => {
        socket.off('chat_message');
        socket.off('message_status_update');
        socket.off('moderation_success');
        socket.off('user_banned');

        socket.on('chat_message', (msg: ChatMessage | ChatMessage[]) => {
            const messages = Array.isArray(msg) ? msg : [msg];
            messages.forEach(m => get().addMessage(m));
        });

        socket.on('message_status_update', (data: {
            messageId: string;
            status: MessageStatus;
            errorMessage?: string;
            platformIds?: Record<string, string>;
        }) => {
            get().updateMessageStatus(data.messageId, data.status, data.errorMessage, data.platformIds);
        });

        socket.on('moderation_success', (data: { action: string; message: string; messageId?: string }) => {
            toast.success(data.message);
            if (data.action === 'delete' && data.messageId) {
                get().removeMessage(data.messageId);
            }
        });

        socket.on('moderation_error', (data: { message: string }) => {
            toast.error(data.message);
        });

        socket.on('user_banned', (data: { targetUserId: string }) => {
            if (data.targetUserId) {
                get().removeMessagesByUserId(data.targetUserId);
            }
        });
    }
}));