import { logger } from '../../utils/logger';

interface CacheEntry<T> {
    data: T;
    expiry: number;
}

/**
 * Caché en memoria para datos de webhooks (Conexiones y Validaciones)
 * Reduce drásticamente las consultas a la DB en eventos de alta frecuencia.
 */
export class WebhookCache {
    private static instance: WebhookCache;
    private cache: Map<string, CacheEntry<unknown>> = new Map();

    private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

    private constructor() {
        // Limpieza periódica de entradas expiradas
        setInterval(() => this.cleanup(), 60 * 1000);
    }

    public static getInstance(): WebhookCache {
        if (!WebhookCache.instance) {
            WebhookCache.instance = new WebhookCache();
        }
        return WebhookCache.instance;
    }

    /**
     * Obtiene un valor del caché
     */
    get<T>(key: string): T | null {
        const entry = this.cache.get(key);
        if (!entry) return null;

        if (Date.now() > entry.expiry) {
            this.cache.delete(key);
            return null;
        }

        return entry.data as T;
    }

    /**
     * Guarda un valor en el caché
     */
    set<T>(key: string, data: T, ttlMs: number = this.DEFAULT_TTL): void {
        this.cache.set(key, {
            data,
            expiry: Date.now() + ttlMs
        });
    }

    /**
     * Elimina una entrada específica o un patrón de entradas
     */
    invalidate(keyOrPattern: string | RegExp): void {
        if (typeof keyOrPattern === 'string') {
            this.cache.delete(keyOrPattern);
            logger.debug({ key: keyOrPattern }, 'Entrada de WebhookCache invalidada');
        } else {
            let count = 0;
            for (const key of this.cache.keys()) {
                if (keyOrPattern.test(key)) {
                    this.cache.delete(key);
                    count++;
                }
            }
            logger.debug({ pattern: keyOrPattern.toString(), count }, 'Entradas de WebhookCache invalidadas por patrón');
        }
    }

    /**
     * Limpia todas las entradas expiradas
     */
    private cleanup(): void {
        const now = Date.now();
        let count = 0;
        for (const [key, entry] of this.cache.entries()) {
            if (now > entry.expiry) {
                this.cache.delete(key);
                count++;
            }
        }
        if (count > 0) {
            logger.debug({ count }, 'Limpieza de WebhookCache completada');
        }
    }

    /**
     * Generadores de llaves estandarizados
     */
    static keys = {
        connection: (provider: string, providerId: string) => `conn:${provider}:${providerId}`,
        webhook: (provider: string, broadcasterId: string, type?: string) =>
            `wh:${provider}:${broadcasterId}${type ? `:${type}` : ''}`,
        twitchSub: (subscriptionId: string) => `wh:twitch:sub:${subscriptionId}`
    };
}
