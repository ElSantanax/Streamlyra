/**
 * Utilidades para Manejo de Errores
 * Responsabilidad: Centralizar patrones de manejo de errores
 * 
 * Proporciona funciones helper para:
 * - Ejecutar código con logging automático
 * - Manejar errores de forma consistente
 * - Emitir eventos de error a Socket.io
 */

import { logger } from './logger';

export interface ErrorContext {
    userId?: string;
    platform?: string;
    action?: string;
    [key: string]: unknown;
}

/**
 * Ejecuta una función con manejo de errores automático
 * 
 * Características:
 * - Logging automático de inicio y fin
 * - Logging automático de errores
 * - Opcionalmente relanza el error
 * - Contexto personalizado en logs
 */
export async function withErrorHandling<T>(
    fn: () => Promise<T>,
    context: ErrorContext & { action: string },
    options: { rethrow?: boolean } = { rethrow: true }
): Promise<T | undefined> {
    const { action, ...logContext } = context;

    try {
        logger.debug(logContext, `${action} started`);
        const result = await fn();
        logger.debug(logContext, `${action} completed`);
        return result;
    } catch (error) {
        logger.error({ err: error, ...logContext }, `Error in ${action}`);

        if (options.rethrow) {
            throw error;
        }

        return undefined;
    }
}

