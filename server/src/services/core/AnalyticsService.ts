import { UserAnalytics } from '../../models/UserAnalytics.model';
import { logger } from '../../utils/logger';

export class AnalyticsService {
    /**
     * Actualiza el último seguidor de un usuario (Upsert)
     */
    static async updateLastFollower(userId: string, platform: string, followerName: string): Promise<UserAnalytics | null> {
        try {
            const now = new Date();

            // Usamos una consulta UPSERT nativa (ON DUPLICATE KEY UPDATE). Atomicidad real y 50% de operaciones de red mitigadas.
            const [analytics] = await UserAnalytics.upsert({
                userId,
                lastFollowerName: followerName,
                lastFollowerPlatform: platform,
                lastFollowerAt: now
            });

            logger.debug({ userId, platform, followerName }, 'Analíticas de seguidor actualizadas');
            return analytics;
        } catch (error) {
            logger.error({ err: error, userId }, 'Error actualizando analytics del último seguidor');
            return null;
        }
    }

    /**
     * Obtiene las analíticas del usuario, aplicando la lógica de expiración de 7 días
     */
    static async getLastFollower(userId: string): Promise<{ name: string; platform: string; at: Date } | null> {
        try {
            const analytics = await UserAnalytics.findByPk(userId);

            if (!analytics || !analytics.lastFollowerName || !analytics.lastFollowerAt) {
                return null;
            }

            const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
            const now = new Date();
            const elapsed = now.getTime() - new Date(analytics.lastFollowerAt).getTime();

            if (elapsed > SEVEN_DAYS_MS) {
                logger.debug({ userId }, 'El último seguidor ha expirado (más de 7 días)');
                return null;
            }

            return {
                name: analytics.lastFollowerName,
                platform: analytics.lastFollowerPlatform,
                at: analytics.lastFollowerAt
            };
        } catch (error) {
            logger.error({ err: error, userId }, 'Error obteniendo analytics del último seguidor');
            return null;
        }
    }

    /**
     * Actualiza el último raid de un usuario
     */
    static async updateLastRaid(userId: string, platform: string, raiderName: string, viewers: number): Promise<UserAnalytics | null> {
        try {
            const now = new Date();

            const [analytics] = await UserAnalytics.upsert({
                userId,
                lastRaidName: raiderName,
                lastRaidPlatform: platform,
                lastRaidViewers: viewers,
                lastRaidAt: now
            });

            logger.debug({ userId, platform, raiderName, viewers }, 'Analíticas de raid actualizadas');
            return analytics;
        } catch (error) {
            logger.error({ err: error, userId }, 'Error actualizando analytics del último raid');
            return null;
        }
    }

    /**
     * Obtiene el último raid del usuario con lógica de expiración
     */
    static async getLastRaid(userId: string): Promise<{ name: string; platform: string; viewers: number; at: Date } | null> {
        try {
            const analytics = await UserAnalytics.findByPk(userId);

            if (!analytics || !analytics.lastRaidName || !analytics.lastRaidAt) {
                return null;
            }

            const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
            const now = new Date();
            const elapsed = now.getTime() - new Date(analytics.lastRaidAt).getTime();

            if (elapsed > SEVEN_DAYS_MS) {
                logger.debug({ userId }, 'El último raid ha expirado (más de 7 días)');
                return null;
            }

            return {
                name: analytics.lastRaidName,
                platform: analytics.lastRaidPlatform,
                viewers: Number(analytics.lastRaidViewers),
                at: analytics.lastRaidAt
            };
        } catch (error) {
            logger.error({ err: error, userId }, 'Error obteniendo analytics del último raid');
            return null;
        }
    }
}
