/** Reintentos con backoff exponencial para reducir consumo de CPU */

import { logger } from './logger';

export interface ExponentialBackoffOptions {
    initialIntervalMs?: number;
    multiplier?: number;
    maxIntervalMs?: number;
    maxAttempts?: number;
    onError?: (error: unknown, attempt: number, nextRetryMs: number) => void;
    onRetry?: (attempt: number, delayMs: number) => void;
    onMaxAttemptsReached?: () => void;
}

export function retryWithExponentialBackoff(
    task: () => Promise<void>,
    options: ExponentialBackoffOptions = {}
): () => void {
    const {
        initialIntervalMs = 60000,
        multiplier = 2,
        maxIntervalMs = 1800000,
        maxAttempts,
        onError,
        onRetry,
        onMaxAttemptsReached
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

        // Verificar si se alcanzó el límite de intentos
        if (maxAttempts && currentAttempt > maxAttempts) {
            logger.warn(
                { currentAttempt, maxAttempts }, 
                'Max retry attempts reached, stopping retries'
            );
            isActive = false;
            
            if (onMaxAttemptsReached) {
                onMaxAttemptsReached();
            }
            
            return;
        }

        try {
            await task();
            
            currentIntervalMs = initialIntervalMs;
            currentAttempt = 0;

        } catch (error) {
            if (!isActive) return;

            const nextIntervalMs = Math.min(
                currentIntervalMs * multiplier,
                maxIntervalMs
            );

            if (onError) {
                onError(error, currentAttempt, nextIntervalMs);
            }

            currentIntervalMs = nextIntervalMs;

            scheduleNextAttempt();
        }
    };

    void executeTask();

    return () => {
        isActive = false;
        if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
        }
        logger.debug({ currentAttempt, currentIntervalMs }, 'Exponential backoff cleanup called');
    };
}

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
