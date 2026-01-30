/**
 * Tipos para el sistema de envío de mensajes multi-plataforma
 */

/**
 * Payload para enviar un mensaje desde el cliente
 */
export interface SendMessagePayload {
    userId: string;
    message: string;
    platforms: string[]; // Array de platform keys: ['twitch', 'youtube', 'kick']
}

/**
 * Resultado del intento de envío a una plataforma específica
 */
export interface PlatformResult {
    platform: string;
    success: boolean;
    error?: string;
    errorCode?: string;
}

/**
 * Resultado del envío de mensajes recibido del servidor
 */
export interface MessageSentResult {
    success: boolean; // true si al menos una plataforma tuvo éxito
    results: PlatformResult[];
    message?: string;
}

/**
 * Error de envío de mensaje
 */
export interface MessageSendError {
    code: string;
    message: string;
}
