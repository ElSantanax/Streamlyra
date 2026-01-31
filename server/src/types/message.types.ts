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
    platform: Platform;
    action: 'delete' | 'ban' | 'timeout';
    messageId?: string; // Requerido para 'delete'
    targetUserId?: string; // Requerido para 'ban' y 'timeout'
    targetUsername?: string; // Para respuestas
    reason?: string; // Opcional para ban/timeout
    duration?: number; // Opcional para timeout (en segundos)
}
