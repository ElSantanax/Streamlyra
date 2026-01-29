/** Estrategia de reconexión de TikTok con backoff exponencial */

import { retryWithExponentialBackoff } from '../../../utils/retryWithExponentialBackoff';
import { logger } from '../../../utils/logger';

export interface ReconnectionConfig {
    initialIntervalMs: number;
    multiplier: number;
    maxIntervalMs: number;
}

export class TikTokReconnectionStrategy {
    private readonly config: ReconnectionConfig = {
        initialIntervalMs: 60000,      // Empezar con 1 minuto
        multiplier: 2,                  // Duplicar cada vez
        maxIntervalMs: 1800000          // Máximo 30 minutos
    };

    startRetry(
        connectionFn: () => Promise<void>,
        username: string
    ): () => void {
        logger.debug({ username }, 'Starting retry with exponential backoff');

        return retryWithExponentialBackoff(connectionFn, {
            ...this.config,
            onError: (err, attempt, nextRetryMs) => {
                logger.debug(
                    {
                        username,
                        attempt,
                        nextRetryMs,
                        nextRetryMinutes: Math.round(nextRetryMs / 60000)
                    },
                    'TikTok connection failed, retrying with exponential backoff'
                );
            },
            onRetry: (attempt, delayMs) => {
                logger.debug(
                    {
                        username,
                        attempt,
                        delayMs,
                        delayMinutes: Math.round(delayMs / 60000)
                    },
                    'Retrying TikTok connection...'
                );
            }
        });
    }
}
