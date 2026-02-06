/**
 * Tipos para el sistema de envío de mensajes multi-plataforma
 */

import { Platform } from '../constants/platforms';

/**
 * Resultado del intento de envío a una plataforma específica
 */
export interface PlatformResult {
    platform: Platform;
    success: boolean;
    messageId?: string;
    error?: string;
    errorCode?: string;
}

/**
 * Request para enviar un mensaje a múltiples plataformas
 */
export interface SendMessageRequest {
    userId: string;
    message: string;
    platforms: Platform[];
}

/**
 * Response del envío de mensajes con resultados agregados
 */
export interface SendMessageResponse {
    success: boolean; // true si al menos una plataforma tuvo éxito
    results: PlatformResult[];
    timestamp: string;
}

/**
 * Request para acciones de moderación
 */
export interface ModerationActionRequest {
    userId: string; // ID del usuario autenticado que realiza la acción
    platform: Platform | 'dashboard';
    action: 'delete' | 'ban' | 'timeout';
    messageId?: string; // Requerido para 'delete'
    targetUserId?: string; // Requerido para 'ban' y 'timeout' (Twitch y Kick usan IDs numéricos)
    targetUsername?: string; // Opcional, solo para referencia en respuestas
    reason?: string; // Opcional para ban/timeout (máximo 100 caracteres en Kick)
    duration?: number; // Opcional para timeout (segundos en Twitch, minutos en Kick: 1-10080)
    platformIds?: Record<string, string>; // IDs específicos de cada plataforma para mensajes dashboard
}
