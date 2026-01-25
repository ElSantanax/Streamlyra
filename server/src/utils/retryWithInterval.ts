/**
 * Retry with Interval - Execute a function repeatedly until success
 * Useful for polling, reconnection attempts, discovery patterns
 */
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

    // Return cleanup function
    return () => clearInterval(interval);
}
