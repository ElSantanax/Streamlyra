/** Estrategia de reconexión de TikTok con backoff exponencial */

import { retryWithExponentialBackoff } from '../../../utils/retryWithExponentialBackoff';
import { logger } from '../../../utils/logger';

export interface ReconnectionConfig {
    initialIntervalMs: number;
    multiplier: number;
    maxIntervalMs: number;
    maxAttempts: number;
}

export class TikTokReconnectionStrategy {
    private readonly config: ReconnectionConfig = {
        initialIntervalMs: 10000,       // 10 segundos entre intentos
        multiplier: 1,                   // Sin incremento (siempre 10s)
        maxIntervalMs: 10000,            // Siempre 10 segundos
        maxAttempts: 12                  // 12 intentos = 2 minutos total
    };

    startRetry(
        connectionFn: () => Promise<void>,
        username: string,
        onMaxAttemptsReached?: () => void
    ): () => void {
        logger.debug({ username, maxAttempts: this.config.maxAttempts }, 'Starting retry with fixed interval');

        return retryWithExponentialBackoff(connectionFn, {
            ...this.config,
            onError: (err, attempt, nextRetryMs) => {
                logger.debug(
                    {
                        username,
                        attempt,
                        maxAttempts: this.config.maxAttempts,
                        nextRetryMs,
                        nextRetrySeconds: Math.round(nextRetryMs / 1000)
                    },
                    'TikTok connection failed, retrying with fixed interval'
                );
            },
            onRetry: (attempt, delayMs) => {
                logger.debug(
                    {
                        username,
                        attempt,
                        maxAttempts: this.config.maxAttempts,
                        delayMs,
                        delaySeconds: Math.round(delayMs / 1000)
                    },
                    'Retrying TikTok connection...'
                );
            },
            onMaxAttemptsReached: () => {
                logger.warn(
                    { 
                        username, 
                        maxAttempts: this.config.maxAttempts,
                        totalDurationSeconds: this.config.maxAttempts * (this.config.initialIntervalMs / 1000)
                    }, 
                    'Max retry attempts reached for TikTok connection'
                );
                
                if (onMaxAttemptsReached) {
                    onMaxAttemptsReached();
                }
            }
        });
    }
}
