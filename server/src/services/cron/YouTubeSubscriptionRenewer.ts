import cron, { ScheduledTask } from 'node-cron';
import { logger } from '../../utils/logger';
import { youtubePubSubService } from '../chat/youtube/YouTubePubSubService';

export class YouTubeSubscriptionRenewer {
    private job: ScheduledTask | null = null;

    start(): void {
        if (this.job) {
            logger.warn('YouTube Subscription Renewer cron already started');
            return;
        }

        logger.info('Iniciando cronjob de renovación de suscripciones de YouTube (04:00 AM diario)');

        this.job = cron.schedule('0 4 * * *', async () => {
            logger.info('Ejecutando tarea programada: Renovación de suscripciones de YouTube');
            await this.renewSubscriptions();
        });
    }

    stop(): void {
        if (this.job) {
            this.job.stop();
            this.job = null;
            logger.info('Cronjob de renovación de suscripciones detenido');
        }
    }

    async renewSubscriptions(): Promise<void> {
        try {
            const expiringSubscriptions = await youtubePubSubService.getExpiringSubscriptions(2);

            if (expiringSubscriptions.length === 0) {
                logger.info('No hay suscripciones de YouTube próximas a expirar');
                return;
            }

            logger.info({ count: expiringSubscriptions.length }, 'Encontradas suscripciones para renovar');

            let renewedCount = 0;
            let errorCount = 0;

            for (const subscription of expiringSubscriptions) {
                try {
                    await youtubePubSubService.renewSubscription(subscription);
                    renewedCount++;
                    await new Promise(resolve => setTimeout(resolve, 500));
                } catch (error) {
                    logger.error({ err: error, subscriptionId: subscription.id }, 'Error renovando suscripción individual');
                    errorCount++;
                }
            }

            logger.info({ renewedCount, errorCount }, 'Proceso de renovación de suscripciones completado');

        } catch (error) {
            logger.error({ err: error }, 'Error fatal en tarea de renovación de suscripciones');
        }
    }
}