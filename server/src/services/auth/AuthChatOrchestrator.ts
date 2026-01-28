/**
 * Orquestador de Chat Post-Autenticación
 * Responsabilidad: Gestionar la conexión de chat después de autenticación
 * 
 * Resuelve:
 * - Race conditions (manejo apropiado de errores)
 * - Errores silenciosos (logging completo)
 * - Separación de intereses (auth no depende de chat)
 */

import { Platform } from '../../constants/platforms';
import { ChatManager } from '../ChatManager';
import { logger } from '../../utils/logger';
import { withErrorHandling } from '../../utils/errorHandling';

export interface ChatConnectionContext {
    userId: string;
    platform: Platform;
    shouldConnect: boolean;
    reason?: string;
}

export class AuthChatOrchestrator {
    constructor(private chatManager: ChatManager) {}

    /**
     * Conecta el chat si es necesario después de autenticación
     * Maneja errores apropiadamente sin interrumpir el flujo de autenticación
     * 
     * @param context - Contexto de conexión de chat
     * @returns Promise que se resuelve cuando la operación termina (éxito o fallo)
     */
    async connectIfNeeded(context: ChatConnectionContext): Promise<void> {
        const { userId, platform, shouldConnect, reason } = context;

        // Si no se debe conectar, salir temprano
        if (!shouldConnect) {
            logger.debug(
                { userId, platform, reason },
                'AuthChatOrchestrator: Skipping chat connection'
            );
            return;
        }

        // Conectar chat con manejo apropiado de errores
        await withErrorHandling(
            async () => {
                logger.info(
                    { userId, platform, reason },
                    'AuthChatOrchestrator: Starting chat connection'
                );

                await this.chatManager.connectProvider(userId, platform);

                logger.info(
                    { userId, platform },
                    'AuthChatOrchestrator: Chat connected successfully'
                );
            },
            { userId, platform, action: 'connectChatAfterAuth' },
            { rethrow: false } // No interrumpir autenticación si falla el chat
        );
    }

    /**
     * Desconecta el chat de una plataforma
     * Usado cuando el usuario desconecta una plataforma manualmente
     * 
     * @param userId - ID del usuario
     * @param platform - Plataforma a desconectar
     * @returns Promise que se resuelve cuando la operación termina
     */
    async disconnect(userId: string, platform: Platform): Promise<void> {
        await withErrorHandling(
            async () => {
                logger.info(
                    { userId, platform },
                    'AuthChatOrchestrator: Starting chat disconnection'
                );

                await this.chatManager.disconnectProvider(userId, platform);

                logger.info(
                    { userId, platform },
                    'AuthChatOrchestrator: Chat disconnected successfully'
                );
            },
            { userId, platform, action: 'disconnectChat' },
            { rethrow: false }
        );
    }

    /**
     * Reconecta el chat de una plataforma
     * Útil cuando se actualizan tokens o se reactiva una conexión
     * 
     * @param userId - ID del usuario
     * @param platform - Plataforma a reconectar
     */
    async reconnect(userId: string, platform: Platform): Promise<void> {
        logger.info(
            { userId, platform },
            'AuthChatOrchestrator: Reconnecting chat (disconnect + connect)'
        );

        // Primero desconectar
        await this.disconnect(userId, platform);

        // Luego conectar
        await this.connectIfNeeded({
            userId,
            platform,
            shouldConnect: true,
            reason: 'reconnection'
        });
    }
}
