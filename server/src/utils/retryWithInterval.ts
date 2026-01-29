/** Reintentos con intervalo fijo para polling y reconexión */

export interface RetryOptions {
    intervalMs?: number;
    onSuccess?: () => void;
    onRetry?: () => void;
    onError?: (error: unknown) => void;
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
