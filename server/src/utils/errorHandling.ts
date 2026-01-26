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
import { AppError } from './AppError';

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

/**
 * Ejecuta una función de forma síncrona con manejo de errores
 */
export function withErrorHandlingSync<T>(
    fn: () => T,
    context: ErrorContext & { action: string },
    options: { rethrow?: boolean } = { rethrow: true }
): T | undefined {
    const { action, ...logContext } = context;

    try {
        logger.debug(logContext, `${action} started`);
        const result = fn();
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

/**
 * Convierte error desconocido a AppError
 */
export function toAppError(error: unknown, defaultMessage: string = 'Unknown error'): AppError {
    if (error instanceof AppError) {
        return error;
    }

    if (error instanceof Error) {
        return new AppError(error.message, 500);
    }

    return new AppError(defaultMessage, 500);
}

/**
 * Extrae mensaje de error de forma segura
 */
export function getErrorMessage(error: unknown): string {
    if (error instanceof Error) {
        return error.message;
    }

    if (typeof error === 'string') {
        return error;
    }

    return 'Unknown error';
}

/**
 * Valida que un valor no sea nulo/indefinido
 */
export function validateRequired<T>(
    value: T | null | undefined,
    fieldName: string
): T {
    if (value === null || value === undefined) {
        throw new AppError(`${fieldName} is required`, 400);
    }

    return value;
}

/**
 * Valida que un array no esté vacío
 */
export function validateNotEmpty<T>(
    array: T[],
    fieldName: string
): T[] {
    if (!Array.isArray(array) || array.length === 0) {
        throw new AppError(`${fieldName} cannot be empty`, 400);
    }

    return array;
}

/**
 * Ejecuta múltiples operaciones y recolecta errores
 * 
 * Útil para operaciones en paralelo donde queremos que todas se ejecuten
 * incluso si algunas fallan
 */
export async function executeWithErrorCollection<T>(
    operations: Array<() => Promise<T>>,
    context: ErrorContext
): Promise<{ results: T[]; errors: Array<{ index: number; error: Error }> }> {
    const results: T[] = [];
    const errors: Array<{ index: number; error: Error }> = [];

    const promises = operations.map(async (op, index) => {
        try {
            const result = await op();
            results[index] = result;
        } catch (error) {
            errors.push({
                index,
                error: error instanceof Error ? error : new Error(String(error))
            });
            logger.error(
                { err: error, ...context, operationIndex: index },
                'Error in operation'
            );
        }
    });

    await Promise.all(promises);

    return { results, errors };
}

/**
 * Retry con backoff exponencial
 */
export async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: {
        maxAttempts?: number;
        initialDelayMs?: number;
        maxDelayMs?: number;
        backoffMultiplier?: number;
    } = {}
): Promise<T> {
    const {
        maxAttempts = 3,
        initialDelayMs = 1000,
        maxDelayMs = 30000,
        backoffMultiplier = 2
    } = options;

    let lastError: Error | undefined;
    let delayMs = initialDelayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            if (attempt < maxAttempts) {
                logger.warn(
                    { attempt, maxAttempts, delayMs, error: lastError.message },
                    'Retry attempt'
                );

                await new Promise(resolve => setTimeout(resolve, delayMs));

                delayMs = Math.min(delayMs * backoffMultiplier, maxDelayMs);
            }
        }
    }

    throw lastError || new Error('Max retry attempts reached');
}
