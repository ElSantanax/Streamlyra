import { Socket } from 'socket.io';
import { logger } from '../../utils/logger';

export class SocketErrorHandler {
    static emitValidationError(socket: Socket, code: string, message: string, context?: Record<string, unknown>) {
        logger.warn({
            socketId: socket.id,
            code,
            ...context
        }, `Validation error: ${message}`);
        
        socket.emit('message_send_error', { code, message });
    }

    static emitAuthorizationError(socket: Socket, payloadUserId: string, authenticatedUserId: string, eventType: string) {
        logger.warn(
            {
                socketId: socket.id,
                payloadUserId,
                authenticatedUserId,
                reason: 'UserId spoofing attempt'
            },
            `SECURITY: Blocked attempt to ${eventType} as another user`
        );
        
        socket.emit('message_send_error', {
            code: 'UNAUTHORIZED',
            message: 'No autorizado para enviar mensajes como este usuario'
        });
    }

    static emitInternalError(socket: Socket, error: unknown, context: string) {
        logger.error({
            err: error,
            socketId: socket.id,
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorStack: error instanceof Error ? error.stack : undefined,
            context
        }, `Unhandled error in ${context}`);
        
        socket.emit('message_send_error', {
            code: 'INTERNAL_ERROR',
            message: 'Error interno del servidor'
        });
    }

    static emitModerationError(socket: Socket, code: string, message: string, context?: Record<string, unknown>) {
        logger.warn({
            socketId: socket.id,
            code,
            ...context
        }, `Moderation error: ${message}`);
        
        socket.emit('moderation_error', { code, message });
    }

    static emitModerationAuthError(socket: Socket, payloadUserId: string, authenticatedUserId: string) {
        logger.warn({ 
            socketId: socket.id, 
            payloadUserId, 
            authenticatedUserId 
        }, 'SECURITY: Blocked moderation attempt as another user');
        
        socket.emit('moderation_error', {
            code: 'UNAUTHORIZED',
            message: 'No autorizado'
        });
    }

    static emitModerationInternalError(socket: Socket, error: unknown) {
        logger.error({ err: error, socketId: socket.id }, 'Error in moderation_action handler');
        
        socket.emit('moderation_error', {
            code: 'MODERATION_FAILED',
            message: error instanceof Error ? error.message : 'Error al ejecutar acción de moderación'
        });
    }
}
