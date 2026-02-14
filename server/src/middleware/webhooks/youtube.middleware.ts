/**
 * Middleware de Validación de Webhooks de YouTube (PubSubHubbub)
 */

import { Request, Response, NextFunction } from 'express';
import { YouTubePubSubService } from '../../services/chat/youtube/YouTubePubSubService';
import { YouTubeSubscription } from '../../models/YouTubeSubscription.model';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

interface RequestWithRawBody extends Request {
    rawBody?: string;
}

export interface RequestWithYouTubeWebhookData extends RequestWithRawBody {
    youtubeWebhookData?: {
        channelId: string;
        body: string;
    };
}

/**
 * Middleware que valida webhooks de YouTube (PubSubHubbub)
 * Maneja tanto GET (verificación) como POST (notificaciones)
 */
export const validateYouTubeWebhook = async (
    req: RequestWithYouTubeWebhookData,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        // GET: Verificación de suscripción (hub.challenge)
        if (req.method === 'GET') {
            const mode = req.query['hub.mode'] as string;
            const topic = req.query['hub.topic'] as string;
            const challenge = req.query['hub.challenge'] as string;

            if (!mode || !topic || !challenge) {
                logger.warn({ query: req.query }, 'Faltan parámetros en verificación de YouTube');
                throw new AppError('Missing verification parameters', 400);
            }

            // Extraer channelId del topic
            const channelIdMatch = topic.match(/channel_id=([^&]+)/);
            const channelId = channelIdMatch ? channelIdMatch[1] : null;

            if (!channelId) {
                logger.warn({ topic }, 'No se pudo extraer channelId del topic');
                throw new AppError('Invalid topic URL', 400);
            }

            // Verificar que tenemos registro de esta suscripción
            const subscription = await YouTubeSubscription.findOne({
                where: { channelId }
            });

            if (!subscription) {
                logger.warn({ channelId, mode }, 'No se encontró suscripción registrada para este canal');
                throw new AppError('Subscription not found', 404);
            }

            // Manejar la verificación
            const responseChallenge = await YouTubePubSubService.handleVerification(
                channelId,
                mode,
                challenge
            );

            // Responder con el challenge
            return res.status(200).type('text/plain').send(responseChallenge);
        }

        // POST: Notificación de actualización
        if (req.method === 'POST') {
            const signature = req.header('X-Hub-Signature');
            const rawBody = req.rawBody || '';

            if (!signature) {
                logger.warn('Falta firma HMAC en notificación de YouTube');
                throw new AppError('Missing signature', 401);
            }

            // El body es XML, lo procesaremos después de validar la firma
            // Necesitamos extraer el channelId del XML para buscar el secret

            // Por ahora, parseamos rápidamente para obtener el channelId
            const channelIdMatch = rawBody.match(/<yt:channelId>([^<]+)<\/yt:channelId>/);
            const channelId = channelIdMatch ? channelIdMatch[1] : null;

            if (!channelId) {
                logger.warn({ bodyPreview: rawBody.substring(0, 200) }, 'No se pudo extraer channelId del XML');
                throw new AppError('Invalid notification body', 400);
            }

            // Buscar el secret en BD
            const subscription = await YouTubeSubscription.findOne({
                where: {
                    channelId,
                    status: 'verified'
                }
            });

            if (!subscription) {
                logger.warn({ channelId }, 'No se encontró suscripción verificada para este canal');
                throw new AppError('Subscription not found', 404);
            }

            // Verificar firma HMAC
            const isValidSignature = YouTubePubSubService.verifySignature(
                subscription.secret,
                rawBody,
                signature
            );

            if (!isValidSignature) {
                logger.warn({ channelId }, 'Firma HMAC inválida en notificación de YouTube');
                throw new AppError('Invalid signature', 401);
            }

            // Actualizar última notificación
            await YouTubePubSubService.updateLastNotification(channelId);

            // Pasar datos al controlador
            req.youtubeWebhookData = {
                channelId,
                body: rawBody
            };

            next();
        }
    } catch (error) {
        if (error instanceof AppError) {
            return next(error);
        }
        logger.error({ err: error }, 'Error fatal validando webhook de YouTube');
        return next(new AppError('YouTube validation failed', 500));
    }
};
