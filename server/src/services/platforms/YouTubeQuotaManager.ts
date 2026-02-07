import fs from 'fs';
import { promises as fsPromises } from 'fs';
import path from 'path';
import { YouTubePollingConfig } from '../../config/youtube.polling.config';
import { logger } from '../../utils/logger';

export class YouTubeQuotaManager {
    private static instance: YouTubeQuotaManager;
    private unitsUsed: number = 0;
    private lastResetDate: string;
    private isExhausted: boolean = false;
    private exhaustedUntil: number = 0;
    private readonly PERSISTENCE_PATH = path.join(process.cwd(), 'youtube-quota.json');
    private persistTimeout: NodeJS.Timeout | null = null;
    private isPersisting: boolean = false;

    private constructor() {
        this.lastResetDate = new Date().toISOString().split('T')[0];
        this.loadPersistedData();
    }

    public static getInstance(): YouTubeQuotaManager {
        if (!YouTubeQuotaManager.instance) {
            YouTubeQuotaManager.instance = new YouTubeQuotaManager();
        }
        return YouTubeQuotaManager.instance;
    }

    private loadPersistedData(): void {
        try {
            if (fs.existsSync(this.PERSISTENCE_PATH)) {
                const data = JSON.parse(fs.readFileSync(this.PERSISTENCE_PATH, 'utf-8'));
                this.unitsUsed = data.unitsUsed || 0;
                this.lastResetDate = data.lastResetDate || new Date().toISOString().split('T')[0];
                this.isExhausted = data.isExhausted || false;
                this.exhaustedUntil = data.exhaustedUntil || 0;

                // Verificar si ya toca resetear según la fecha cargada
                this.checkAndResetDaily();
            }
        } catch (error) {
            logger.error({ err: error }, 'Error loading YouTube quota persistence');
        }
    }

    /**
     * Persiste los datos de forma asíncrona y debounced para no colapsar el disco ni bloquear el event loop.
     */
    private persistData(immediate = false): void {
        if (this.persistTimeout) {
            clearTimeout(this.persistTimeout);
            this.persistTimeout = null;
        }

        if (immediate) {
            void this.doPersist();
            return;
        }

        // Debounce de 2 segundos para escrituras frecuentes
        this.persistTimeout = setTimeout(() => {
            void this.doPersist();
        }, 2000);
    }

    private async doPersist(): Promise<void> {
        if (this.isPersisting) return;
        this.isPersisting = true;

        try {
            const data = {
                unitsUsed: this.unitsUsed,
                lastResetDate: this.lastResetDate,
                isExhausted: this.isExhausted,
                exhaustedUntil: this.exhaustedUntil
            };
            await fsPromises.writeFile(this.PERSISTENCE_PATH, JSON.stringify(data, null, 2));
        } catch (error) {
            logger.error({ err: error }, 'Error saving YouTube quota persistence');
        } finally {
            this.isPersisting = false;
        }
    }

    /**
     * Verifica si hay cuota disponible para una operación
     */
    public hasQuota(requestedUnits: number = 1): boolean {
        this.checkAndResetDaily();

        // En desarrollo, FORZAMOS que siempre intente la petición para ver el error real de Google
        const isDev = process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
        if (isDev) return true;

        // Si estamos en periodo de bloqueo por error de cuota previo
        if (this.isExhausted && Date.now() < this.exhaustedUntil) {
            return false;
        } else if (this.isExhausted) {
            this.isExhausted = false;
            this.persistData(true);
        }

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
            this.markAsExhausted(true); // Bloqueo de 24h aproximado por límite diario
        } else {
            this.persistData();
        }
    }

    /**
     * Marca la cuota como agotada (usualmente disparado por un error 403 de la API)
     * isDailyLimit Si es true, el bloqueo es largo. Si es false (por defecto), es temporal (15 min)
     */
    public markAsExhausted(isDailyLimit: boolean = false): void {
        const blockDuration = isDailyLimit ? 60 * 60 * 1000 : 15 * 60 * 1000; // 1h o 15 min
        this.isExhausted = true;
        this.exhaustedUntil = Date.now() + blockDuration;
        this.persistData(true);

        logger.warn({
            unitsUsed: this.unitsUsed,
            retryInMinutes: isDailyLimit ? 60 : 15
        }, 'CUOTA DE YOUTUBE AGOTADA O LÍMITE DE TASA ALCANZADO');
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
            this.persistData(true);
        }
    }
}
