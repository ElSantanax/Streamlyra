/**
 * Retry with Exponential Backoff
 * Responsabilidad: Ejecutar una función repetidamente con backoff exponencial
 * 
 * PROBLEMA QUE RESUELVE:
 * - Reintentos constantes que consumen CPU innecesariamente
 * - Rate limiting por demasiados intentos frecuentes
 * - Falta de "respiro" para servicios externos
 * 
 * SOLUCIÓN:
 * - Aumenta progresivamente el tiempo entre reintentos
 * - Reduce consumo de CPU con el tiempo
 * - Evita rate limiting de servicios externos
 * - Implementa límite máximo de espera
 */

import { logger } from './logger';

export interface ExponentialBackoffOptions {
    /**
     * Intervalo inicial en milisegundos (default: 60000 = 1 minuto)
     */
    initialIntervalMs?: number;

    /**
     * Factor de multiplicación para cada reintento (default: 2)
     * Ejemplo: 2 = duplica el tiempo en cada intento
     */
    multiplier?: number;

    /**
     * Intervalo máximo en milisegundos (default: 1800000 = 30 minutos)
     * Evita que el backoff crezca indefinidamente
     */
    maxIntervalMs?: number;

    /**
     * Callback ejecutado cuando ocurre un error
     */
    onError?: (error: unknown, attempt: number, nextRetryMs: number) => void;

    /**
     * Callback ejecutado antes de cada reintento
     */
    onRetry?: (attempt: number, delayMs: number) => void;
}

/**
 * Ejecuta una función con backoff exponencial
 * 
 * @param task - Función async a ejecutar repetidamente
 * @param options - Opciones de configuración del backoff
 * @returns Función de cleanup para detener los reintentos
 * 
 * @example
 * ```typescript
 * const cleanup = retryWithExponentialBackoff(
 *   async () => await connectToService(),
 *   {
 *     initialIntervalMs: 60000,  // 1 minuto
 *     multiplier: 2,              // Duplica cada vez
 *     maxIntervalMs: 1800000,     // Máximo 30 minutos
 *     onError: (err, attempt, nextRetry) => {
 *       console.log(`Attempt ${attempt} failed, retrying in ${nextRetry}ms`);
 *     }
 *   }
 * );
 * 
 * // Detener reintentos
 * cleanup();
 * ```
 */
export function retryWithExponentialBackoff(
    task: () => Promise<void>,
    options: ExponentialBackoffOptions = {}
): () => void {
    const {
        initialIntervalMs = 60000,      // 1 minuto por defecto
        multiplier = 2,                  // Duplica cada vez
        maxIntervalMs = 1800000,         // 30 minutos máximo
        onError,
        onRetry
    } = options;

    let timeoutId: NodeJS.Timeout | null = null;
    let currentAttempt = 0;
    let currentIntervalMs = initialIntervalMs;
    let isActive = true;

    const scheduleNextAttempt = () => {
        if (!isActive) return;

        if (onRetry) {
            onRetry(currentAttempt + 1, currentIntervalMs);
        }

        timeoutId = setTimeout(() => {
            void executeTask();
        }, currentIntervalMs);
    };

    const executeTask = async () => {
        if (!isActive) return;

        currentAttempt++;

        try {
            await task();
            
            // Si la tarea tiene éxito, resetear el intervalo
            currentIntervalMs = initialIntervalMs;
            currentAttempt = 0;

        } catch (error) {
            if (!isActive) return;

            // Calcular el siguiente intervalo con backoff exponencial
            const nextIntervalMs = Math.min(
                currentIntervalMs * multiplier,
                maxIntervalMs
            );

            // Llamar callback de error si existe
            if (onError) {
                onError(error, currentAttempt, nextIntervalMs);
            }

            // Actualizar intervalo para el próximo intento
            currentIntervalMs = nextIntervalMs;

            // Programar siguiente reintento
            scheduleNextAttempt();
        }
    };

    // Ejecutar inmediatamente la primera vez
    void executeTask();

    // Retornar función de cleanup
    return () => {
        isActive = false;
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        logger.debug({ currentAttempt, currentIntervalMs }, 'Exponential backoff cleanup called');
    };
}

/**
 * Calcula el tiempo de espera para un intento específico
 * Útil para testing y debugging
 * 
 * @param attempt - Número de intento (1-based)
 * @param initialMs - Intervalo inicial
 * @param multiplier - Factor de multiplicación
 * @param maxMs - Intervalo máximo
 * @returns Tiempo de espera en milisegundos
 */
export function calculateBackoffDelay(
    attempt: number,
    initialMs: number,
    multiplier: number,
    maxMs: number
): number {
    if (attempt <= 1) return initialMs;
    
    const delay = initialMs * Math.pow(multiplier, attempt - 1);
    return Math.min(delay, maxMs);
}
