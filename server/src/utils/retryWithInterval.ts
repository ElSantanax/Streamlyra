/** Reintentos con intervalo fijo y límite de intentos para polling y reconexión */

export interface RetryWithLimitOptions {
    intervalMs?: number;
    maxAttempts?: number;
    onSuccess?: () => void;
    onRetry?: () => void;
    onError?: (error: unknown) => void;
    onMaxAttemptsReached?: () => void;
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

    // Configurar intentos
    intervalId = setInterval(() => {
        void executeAttempt();
    }, intervalMs);

    return cleanup;
}
