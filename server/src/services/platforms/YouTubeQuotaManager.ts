/**
 * Gestor de cuota de YouTube API
 * Rastrea el consumo diario de unidades de cuota para evitar llamadas innecesarias cuando se agota.
 */

import { YouTubePollingConfig } from '../../config/youtube.polling.config';
import { logger } from '../../utils/logger';

export class YouTubeQuotaManager {
    private static instance: YouTubeQuotaManager;
    private unitsUsed: number = 0;
    private lastResetDate: string;
    private isExhausted: boolean = false;

    private constructor() {
        this.lastResetDate = new Date().toISOString().split('T')[0];
    }

    public static getInstance(): YouTubeQuotaManager {
        if (!YouTubeQuotaManager.instance) {
            YouTubeQuotaManager.instance = new YouTubeQuotaManager();
        }
        return YouTubeQuotaManager.instance;
    }

    /**
     * Verifica si hay cuota disponible para una operación
     */
    public hasQuota(requestedUnits: number = 1): boolean {
        this.checkAndResetDaily();

        if (this.isExhausted) return false;

        return (this.unitsUsed + requestedUnits) <= YouTubePollingConfig.DAILY_QUOTA_LIMIT;
    }

    /**
     * Registra el consumo de unidades
     */
    public consumeQuota(units: number): void {
        this.checkAndResetDaily();
        this.unitsUsed += units;

        logger.debug({
            unitsUsed: this.unitsUsed,
            limit: YouTubePollingConfig.DAILY_QUOTA_LIMIT,
            percent: ((this.unitsUsed / YouTubePollingConfig.DAILY_QUOTA_LIMIT) * 100).toFixed(2) + '%'
        }, 'YouTube quota consumed');

        if (this.unitsUsed >= YouTubePollingConfig.DAILY_QUOTA_LIMIT) {
            this.markAsExhausted();
        }
    }

    /**
     * Marca la cuota como agotada (usualmente disparado por un error 403 de la API)
     */
    public markAsExhausted(): void {
        if (!this.isExhausted) {
            this.isExhausted = true;
            logger.warn({ unitsUsed: this.unitsUsed }, 'CUOTA DE YOUTUBE AGOTADA PARA HOY');
        }
    }

    /**
     * Retorna el estado actual de la cuota
     */
    public getStatus() {
        this.checkAndResetDaily();
        const percentUsed = (this.unitsUsed / YouTubePollingConfig.DAILY_QUOTA_LIMIT) * 100;
        return {
            unitsUsed: this.unitsUsed,
            limit: YouTubePollingConfig.DAILY_QUOTA_LIMIT,
            isExhausted: this.isExhausted,
            remaining: Math.max(0, YouTubePollingConfig.DAILY_QUOTA_LIMIT - this.unitsUsed),
            percentUsed
        };
    }

    /**
     * Calcula un intervalo de polling adaptativo basado en la cuota restante.
     * Si queda poca cuota, aumenta el intervalo para estirar el tiempo de uso.
     */
    public getAdaptiveInterval(baseInterval: number): number {
        const stats = this.getStatus();

        if (stats.isExhausted) return baseInterval * 10; // Si está agotado, no debería llamarse pero por seguridad

        // Si hemos usado más del 80% de la cuota, triplicamos el intervalo
        if (stats.percentUsed > 80) {
            return baseInterval * 3;
        }

        // Si hemos usado más del 50%, lo duplicamos
        if (stats.percentUsed > 50) {
            return baseInterval * 2;
        }

        return baseInterval;
    }

    private checkAndResetDaily(): void {
        const today = new Date().toISOString().split('T')[0];
        if (this.lastResetDate !== today) {
            logger.info({ previousUnits: this.unitsUsed, date: today }, 'Restableciendo cuota diaria de YouTube');
            this.unitsUsed = 0;
            this.isExhausted = false;
            this.lastResetDate = today;
        }
    }
}
