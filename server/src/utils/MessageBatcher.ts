import { Server } from 'socket.io';
import { logger } from './logger';
import { NormalizedChatMessage } from '../services/chat/transformers/EventTransformer';

/**
 * Servicio de agrupación de mensajes para optimizar el rendimiento de la red y el frontend.
 * Acumula mensajes por usuario y los envía en ráfagas cada 100ms.
 */
export class MessageBatcher {
    private static instance: MessageBatcher;
    private queue: Map<string, NormalizedChatMessage[]> = new Map();
    private io?: Server;
    private interval: ReturnType<typeof setInterval> | null = null;
    private readonly FLUSH_INTERVAL = 100; // 100ms de frecuencia para el volcado

    private constructor() { }

    static getInstance(): MessageBatcher {
        if (!MessageBatcher.instance) {
            MessageBatcher.instance = new MessageBatcher();
        }
        return MessageBatcher.instance;
    }

    /**
     * Inicializa el batcher con la instancia de Socket.io.
     */
    setIo(io: Server) {
        if (this.io) return;

        this.io = io;
        if (!this.interval) {
            this.interval = setInterval(() => this.flush(), this.FLUSH_INTERVAL);
        }
    }

    /**
     * Añade un mensaje a la cola de un usuario específico.
     */
    add(userId: string, data: NormalizedChatMessage) {

        if (!this.queue.has(userId)) {
            this.queue.set(userId, []);
        }
        this.queue.get(userId)?.push(data as NormalizedChatMessage);
    }

    /**
     * Envía todos los mensajes acumulados a sus respectivos usuarios.
     */
    private flush() {
        if (this.queue.size === 0 || !this.io) return;

        for (const [userId, messages] of this.queue.entries()) {
            if (messages.length === 0) continue;

            try {
                // Emitimos el lote (si es 1, enviamos el objeto; si son más, el array)
                this.io.to(userId).emit('chat_message', messages.length === 1 ? messages[0] : messages);

                // Limpiamos la cola para este usuario
                this.queue.set(userId, []);
            } catch (error) {
                logger.error({ err: error, userId }, 'Error volcando lote de mensajes');
            }
        }
    }
}
