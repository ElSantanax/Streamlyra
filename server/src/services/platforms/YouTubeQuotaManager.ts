import { YouTubePollingConfig } from '../../config/youtube.polling.config';
import { logger } from '../../utils/logger';
import { YouTubeQuota } from '../../models/YouTubeQuota.model';

export class YouTubeQuotaManager {
    private static instance: YouTubeQuotaManager;
    private unitsUsed: number = 0;
    private lastResetDate: string;
    private isExhausted: boolean = false;
    private exhaustedUntil: number = 0;
    private initialized: boolean = false;

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
     * Inicializa el gestor cargando el estado desde la base de datos
     */
    private async initialize(): Promise<void> {
        if (this.initialized) return;

        const today = this.getTodayDate();
        const quota = await YouTubeQuota.findOne({ where: { date: today } });

        if (quota) {
            this.unitsUsed = quota.unitsUsed;
            this.isExhausted = quota.isExhausted;
            this.exhaustedUntil = quota.exhaustedUntil ? quota.exhaustedUntil.getTime() : 0;

            logger.info({
                date: today,
                unitsUsed: this.unitsUsed,
                isExhausted: this.isExhausted
            }, 'Estado de cuota de YouTube cargado desde BD');
        } else {
            // Crear registro para hoy
            await YouTubeQuota.create({
                date: today,
                unitsUsed: 0,
                isExhausted: false,
                exhaustedUntil: null,
                lastReset: new Date()
            });

            logger.info({ date: today }, 'Nuevo registro de cuota de YouTube creado');
        }

        this.initialized = true;
    }

    /**
     * Persiste el estado actual en la base de datos
     */
    private async persistState(): Promise<void> {
        const today = this.getTodayDate();

        await YouTubeQuota.upsert({
            date: today,
            unitsUsed: this.unitsUsed,
            isExhausted: this.isExhausted,
            exhaustedUntil: this.isExhausted && this.exhaustedUntil > 0
                ? new Date(this.exhaustedUntil)
                : null,
            lastReset: new Date()
        });
    }

    /**
     * Verifica si hay cuota disponible para una operación
     */
    public async hasQuota(requestedUnits: number = 1): Promise<boolean> {
        await this.initialize();
        await this.checkAndResetDaily();

        // En desarrollo, FORZAMOS que siempre intente la petición para ver el error real de Google
        const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
        if (isDev) return true;

        // Si estamos en periodo de bloqueo por error de cuota previo
        if (this.isExhausted && Date.now() < this.exhaustedUntil) {
            return false;
        } else if (this.isExhausted) {
            this.isExhausted = false;
            await this.persistState();
        }

        return (this.unitsUsed + requestedUnits) <= YouTubePollingConfig.DAILY_QUOTA_LIMIT;
    }

    /**
     * Registra el consumo de unidades
     */
    public async consumeQuota(units: number): Promise<void> {
        await this.initialize();
        await this.checkAndResetDaily();

        this.unitsUsed += units;

        logger.debug({
            unitsUsed: this.unitsUsed,
            limit: YouTubePollingConfig.DAILY_QUOTA_LIMIT,
            percent: ((this.unitsUsed / YouTubePollingConfig.DAILY_QUOTA_LIMIT) * 100).toFixed(2) + '%'
        }, 'YouTube quota consumed');

        // Persistir en BD
        await this.persistState();

        if (this.unitsUsed >= YouTubePollingConfig.DAILY_QUOTA_LIMIT) {
            await this.markAsExhausted(true);
        }
    }

    /**
     * Marca la cuota como agotada (usualmente disparado por un error 403 de la API)
     * isDailyLimit Si es true, el bloqueo es largo. Si es false (por defecto), es temporal (15 min)
     */
    public async markAsExhausted(isDailyLimit: boolean = false): Promise<void> {
        await this.initialize();

        const blockDuration = isDailyLimit ? 60 * 60 * 1000 : 15 * 60 * 1000; // 1h o 15 min
        this.isExhausted = true;
        this.exhaustedUntil = Date.now() + blockDuration;

        logger.warn({
            unitsUsed: this.unitsUsed,
            retryInMinutes: isDailyLimit ? 60 : 15
        }, 'CUOTA DE YOUTUBE AGOTADA O LÍMITE DE TASA ALCANZADO');

        await this.persistState();
    }

    /**
     * Retorna el estado actual de la cuota
     */
    public async getStatus() {
        await this.initialize();
        await this.checkAndResetDaily();

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
    public async getAdaptiveInterval(baseInterval: number): Promise<number> {
        const stats = await this.getStatus();

        if (stats.isExhausted) return baseInterval * 10;

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

    private getTodayDate(): string {
        return new Date().toISOString().split('T')[0];
    }

    private async checkAndResetDaily(): Promise<void> {
        const today = this.getTodayDate();

        if (this.lastResetDate !== today) {
            logger.info({ previousUnits: this.unitsUsed, date: today }, 'Restableciendo cuota diaria de YouTube');

            this.unitsUsed = 0;
            this.isExhausted = false;
            this.exhaustedUntil = 0;
            this.lastResetDate = today;

            // Crear nuevo registro para el día actual
            await YouTubeQuota.create({
                date: today,
                unitsUsed: 0,
                isExhausted: false,
                exhaustedUntil: null,
                lastReset: new Date()
            });
        }
    }
}
