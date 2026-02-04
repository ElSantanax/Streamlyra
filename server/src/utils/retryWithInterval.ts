/** Reintentos con intervalo fijo para polling y reconexión */

export interface RetryOptions {
    intervalMs?: number;
    onSuccess?: () => void;
    onRetry?: () => void;
    onError?: (error: unknown) => void;
}

export interface RetryWithLimitOptions extends RetryOptions {
    maxAttempts?: number;
    onMaxAttemptsReached?: () => void;
}

export function retryWithInterval(
    fn: () => Promise<void>,
    options: RetryOptions = {}
): () => void {
    const {
        intervalMs = 60000,
        onSuccess,
        onRetry,
        onError
    } = options;

    const interval = setInterval(async () => {
        try {
            await fn();
            onSuccess?.();
            clearInterval(interval);
        } catch (error) {
            onRetry?.();
            onError?.(error);
        }
    }, intervalMs);

    return () => clearInterval(interval);
}

export function retryWithIntervalAndLimit(
    fn: () => Promise<void>,
    options: RetryWithLimitOptions = {}
): () => void {
    const {
        intervalMs = 10000,
        maxAttempts = 12,
        onSuccess,
        onRetry,
        onError,
        onMaxAttemptsReached
    } = options;

    let currentAttempt = 0;
    let intervalId: NodeJS.Timeout | null = null;
    let isActive = true;

    const executeAttempt = async () => {
        if (!isActive) return;

        currentAttempt++;

        try {
            await fn();
            
            // Éxito: limpiar y notificar
            if (isActive) {
                cleanup();
                onSuccess?.();
            }
        } catch (error) {
            if (!isActive) return;

            // Error: verificar si debemos continuar
            if (currentAttempt >= maxAttempts) {
                cleanup();
                onMaxAttemptsReached?.();
            } else {
                onRetry?.();
                onError?.(error);
            }
        }
    };

    const cleanup = () => {
        isActive = false;
        if (intervalId) {
            clearInterval(intervalId);
            intervalId = null;
        }
    };

    // Primer intento inmediato
    void executeAttempt();

    // Configurar intentos subsecuentes
    intervalId = setInterval(() => {
        void executeAttempt();
    }, intervalMs);

    return cleanup;
}
