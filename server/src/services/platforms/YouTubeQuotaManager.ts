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
    private initializationPromise: Promise<void> | null = null;
    private isDirty: boolean = false;
    private persistTimer: NodeJS.Timeout | null = null;
    private persistedUnits: number = 0;

    private constructor() {
        this.lastResetDate = new Date().toISOString().split('T')[0];
    }

    public static getInstance(): YouTubeQuotaManager {
        if (!YouTubeQuotaManager.instance) {
            YouTubeQuotaManager.instance = new YouTubeQuotaManager();
        }
        return YouTubeQuotaManager.instance;
    }

    private async ensureInitialized(): Promise<void> {
        const today = this.getTodayDate();

        if (!this.initialized) {
            if (!this.initializationPromise) {
                this.initializationPromise = this.initialize(today);
            }
            await this.initializationPromise;
        }

        if (this.lastResetDate !== today) {
            await this.checkAndResetDaily(today);
        }
    }

    private async initialize(today: string): Promise<void> {
        const quota = await YouTubeQuota.findOne({ where: { date: today } });

        if (quota) {
            this.unitsUsed = quota.unitsUsed;
            this.persistedUnits = quota.unitsUsed;
            this.isExhausted = quota.isExhausted;
            this.exhaustedUntil = quota.exhaustedUntil ? quota.exhaustedUntil.getTime() : 0;
            this.lastResetDate = today;

            logger.info({
                date: today,
                unitsUsed: this.unitsUsed,
                isExhausted: this.isExhausted
            }, 'Estado de cuota de YouTube cargado desde BD');
        } else {
            await YouTubeQuota.create({
                date: today,
                unitsUsed: 0,
                isExhausted: false,
                exhaustedUntil: null,
                lastReset: new Date()
            });

            this.lastResetDate = today;
            logger.info({ date: today }, 'Nuevo registro de cuota de YouTube creado');
        }

        this.initialized = true;
        this.initializationPromise = null;
    }

    private async persistState(): Promise<void> {
        if (!this.initialized) return;

        const today = this.getTodayDate();
        const unitsToSync = this.unitsUsed - this.persistedUnits;

        try {
            await YouTubeQuota.upsert({
                date: today,
                unitsUsed: this.unitsUsed,
                isExhausted: this.isExhausted,
                exhaustedUntil: this.isExhausted && this.exhaustedUntil > 0
                    ? new Date(this.exhaustedUntil)
                    : null,
                lastReset: new Date()
            });

            this.persistedUnits = this.unitsUsed;
            this.isDirty = false;
            logger.debug({ unitsSync: unitsToSync, totalSinceStart: this.unitsUsed }, 'Estado de cuota de YouTube sincronizado con BD');
        } catch (error) {
            logger.error({ err: error }, 'Error al sincronizar estado de cuota de YouTube');
        }
    }

    private schedulePersistence(): void {
        this.isDirty = true;
        if (this.persistTimer) return;

        this.persistTimer = setTimeout(async () => {
            this.persistTimer = null;
            if (this.isDirty) {
                await this.persistState();
            }
        }, YouTubePollingConfig.QUOTA_PERSIST_INTERVAL_MS);
    }

    public async hasQuota(requestedUnits: number = 1): Promise<boolean> {
        await this.ensureInitialized();

        const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
        if (isDev) return true;

        if (this.isExhausted && Date.now() < this.exhaustedUntil) {
            return false;
        } else if (this.isExhausted) {
            this.isExhausted = false;
            await this.persistState();
        }

        return (this.unitsUsed + requestedUnits) <= YouTubePollingConfig.DAILY_QUOTA_LIMIT;
    }

    public async consumeQuota(units: number): Promise<void> {
        await this.ensureInitialized();

        this.unitsUsed += units;

        logger.debug({
            unitsUsed: this.unitsUsed,
            limit: YouTubePollingConfig.DAILY_QUOTA_LIMIT,
            percent: ((this.unitsUsed / YouTubePollingConfig.DAILY_QUOTA_LIMIT) * 100).toFixed(2) + '%'
        }, 'YouTube quota consumed');

        this.schedulePersistence();

        if (this.unitsUsed >= YouTubePollingConfig.DAILY_QUOTA_LIMIT) {
            await this.markAsExhausted(true);
        }
    }

    public async markAsExhausted(isDailyLimit: boolean = false): Promise<void> {
        await this.ensureInitialized();

        const blockDuration = isDailyLimit ? 60 * 60 * 1000 : 15 * 60 * 1000;
        this.isExhausted = true;
        this.exhaustedUntil = Date.now() + blockDuration;

        logger.warn({
            unitsUsed: this.unitsUsed,
            retryInMinutes: isDailyLimit ? 60 : 15
        }, 'CUOTA DE YOUTUBE AGOTADA O LÍMITE DE TASA ALCANZADO');

        if (this.persistTimer) {
            clearTimeout(this.persistTimer);
            this.persistTimer = null;
        }
        await this.persistState();
    }

    public async getStatus() {
        await this.ensureInitialized();

        const percentUsed = (this.unitsUsed / YouTubePollingConfig.DAILY_QUOTA_LIMIT) * 100;
        return {
            unitsUsed: this.unitsUsed,
            limit: YouTubePollingConfig.DAILY_QUOTA_LIMIT,
            isExhausted: this.isExhausted,
            remaining: Math.max(0, YouTubePollingConfig.DAILY_QUOTA_LIMIT - this.unitsUsed),
            percentUsed
        };
    }

    public async getAdaptiveInterval(baseInterval: number): Promise<number> {
        const stats = await this.getStatus();

        if (stats.isExhausted) return baseInterval * 10;

        if (stats.percentUsed > 80) {
            return baseInterval * 3;
        }

        if (stats.percentUsed > 50) {
            return baseInterval * 2;
        }

        return baseInterval;
    }

    private getTodayDate(): string {
        return new Date().toISOString().split('T')[0];
    }

    private async checkAndResetDaily(today: string): Promise<void> {
        if (this.lastResetDate !== today) {
            logger.info({ previousUnits: this.unitsUsed, date: today }, 'Restableciendo cuota diaria de YouTube');

            this.unitsUsed = 0;
            this.isExhausted = false;
            this.exhaustedUntil = 0;
            this.lastResetDate = today;

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