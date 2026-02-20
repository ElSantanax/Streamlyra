import { Server } from 'socket.io';
import { logger } from './logger';
import { NormalizedChatMessage } from '../services/chat/transformers/EventTransformer';

export class MessageBatcher {
    private static instance: MessageBatcher;
    private queue: Map<string, NormalizedChatMessage[]> = new Map();
    private io?: Server;
    private interval: ReturnType<typeof setInterval> | null = null;
    private readonly FLUSH_INTERVAL = 100;

    private constructor() { }

    static getInstance(): MessageBatcher {
        if (!MessageBatcher.instance) {
            MessageBatcher.instance = new MessageBatcher();
        }
        return MessageBatcher.instance;
    }

    setIo(io: Server) {
        if (this.io) return;

        this.io = io;
        if (!this.interval) {
            this.interval = setInterval(() => this.flush(), this.FLUSH_INTERVAL);
        }
    }

    add(userId: string, data: NormalizedChatMessage) {
        if (!this.queue.has(userId)) {
            this.queue.set(userId, []);
        }
        this.queue.get(userId)?.push(data as NormalizedChatMessage);
    }

    private flush() {
        if (this.queue.size === 0 || !this.io) return;

        for (const [userId, messages] of this.queue.entries()) {
            if (messages.length === 0) continue;

            try {
                this.io.to(userId).emit('chat_message', messages.length === 1 ? messages[0] : messages);
                this.queue.set(userId, []);
            } catch (error) {
                logger.error({ err: error, userId }, 'Error volcando lote de mensajes');
            }
        }
    }
}