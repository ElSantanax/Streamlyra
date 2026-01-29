/** Wrapper seguro para emisiones de Socket.IO con manejo de errores */

import { Server } from 'socket.io';
import { logger } from './logger';

interface EmitOptions {
    userId: string;
    event: string;
    data: unknown;
    platform?: string;
}

export class SafeSocketEmitter {
    static emit(io: Server, options: EmitOptions): boolean {
        const { userId, event, data, platform } = options;

        try {
            if (!userId || typeof userId !== 'string') {
                logger.warn(
                    { userId, event, platform },
                    'SafeSocketEmitter: userId inválido'
                );
                return false;
            }

            if (!event || typeof event !== 'string') {
                logger.warn(
                    { userId, event, platform },
                    'SafeSocketEmitter: event inválido'
                );
                return false;
            }

            if (data === undefined) {
                logger.warn(
                    { userId, event, platform },
                    'SafeSocketEmitter: data es undefined'
                );
                return false;
            }

            if (io.sockets?.adapter?.rooms) {
                const sockets = io.sockets.adapter.rooms.get(userId);

                logger.debug(
                    {
                        userId,
                        event,
                        platform,
                        hasRoom: !!sockets,
                        socketCount: sockets?.size || 0,
                        allRooms: Array.from(io.sockets.adapter.rooms.keys()).slice(0, 10)
                    },
                    'SafeSocketEmitter: Verificando room del usuario'
                );

                if (!sockets || sockets.size === 0) {
                    logger.debug(
                        { userId, event, platform },
                        'SafeSocketEmitter: Usuario sin sockets activos, omitiendo emisión'
                    );
                    return false;
                }
            }

            try {
                JSON.stringify(data);
            } catch (serializationError) {
                logger.error(
                    { err: serializationError, userId, event, platform },
                    'SafeSocketEmitter: Error de serialización (posible referencia circular)'
                );
                return false;
            }

            io.to(userId).emit(event, data);

            logger.debug(
                { userId, event, platform },
                'SafeSocketEmitter: Evento emitido exitosamente'
            );

            return true;

        } catch (error) {
            logger.error(
                { err: error, userId, event, platform },
                'SafeSocketEmitter: Error inesperado al emitir evento'
            );
            return false;
        }
    }

    private static ownerMessageCache = new Map<string, number>();

    static emitChatMessage(io: Server, userId: string, message: unknown, platform?: string): boolean {
        interface ChatMessage {
            isOwner?: boolean;
            message?: string;
        }

        const msg = message as ChatMessage;

        logger.debug(
            {
                userId,
                platform,
                isOwner: msg?.isOwner,
                messagePreview: typeof msg?.message === 'string' ? msg.message.substring(0, 50) : undefined
            },
            'SafeSocketEmitter: emitChatMessage called'
        );

        if (msg && typeof msg === 'object' && msg.isOwner && typeof msg.message === 'string') {
            const cacheKey = `${userId}:${msg.message}`;
            const now = Date.now();
            const lastTime = this.ownerMessageCache.get(cacheKey);

            logger.debug(
                {
                    userId,
                    platform,
                    cacheKey,
                    lastTime,
                    timeSinceLastEmit: lastTime ? now - lastTime : null,
                    willDeduplicate: lastTime && (now - lastTime) < 5000
                },
                'SafeSocketEmitter: Checking deduplication for owner message'
            );

            if (lastTime && (now - lastTime) < 5000) {
                logger.debug(
                    { userId, platform, message: msg.message },
                    'SafeSocketEmitter: Omitiendo eco de mensaje del streamer (deduplicación)'
                );
                return false;
            }

            this.ownerMessageCache.set(cacheKey, now);

            if (this.ownerMessageCache.size > 100) {
                for (const [key, time] of this.ownerMessageCache.entries()) {
                    if (now - time > 10000) {
                        this.ownerMessageCache.delete(key);
                    }
                }
            }
        }

        return this.emit(io, {
            userId,
            event: 'chat_message',
            data: message,
            platform
        });
    }

    static emitViewersUpdate(
        io: Server,
        userId: string,
        platform: string,
        count: number
    ): boolean {
        return this.emit(io, {
            userId,
            event: 'viewers_update',
            data: { platform, count },
            platform
        });
    }

    static emitConnectionStatus(
        io: Server,
        userId: string,
        platform: string,
        status: 'connecting' | 'connected' | 'disconnected' | 'error',
        message?: string
    ): boolean {
        return this.emit(io, {
            userId,
            event: 'connection_status',
            data: { platform, status, message },
            platform
        });
    }

    static emitError(
        io: Server,
        userId: string,
        code: string,
        message: string,
        platform?: string
    ): boolean {
        return this.emit(io, {
            userId,
            event: 'error',
            data: { code, message },
            platform
        });
    }
}
