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
