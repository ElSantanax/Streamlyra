/**
 * Factory para obtener el procesador de webhook correcto
 * Responsabilidad: Crear instancias del procesador apropiado por plataforma
 */

import { Server } from 'socket.io';
import { Platform } from '../../constants/platforms';
import { KickWebhookProcessor } from './processors/KickWebhookProcessor';
import { YouTubeWebhookProcessor } from './processors/YouTubeWebhookProcessor';
import { TwitchWebhookProcessor } from './processors/TwitchWebhookProcessor';
import { TikTokWebhookProcessor } from './processors/TikTokWebhookProcessor';

type WebhookProcessor = KickWebhookProcessor | YouTubeWebhookProcessor | TwitchWebhookProcessor | TikTokWebhookProcessor;

export class WebhookProcessorFactory {
    static getProcessor(platform: Platform, io: Server): WebhookProcessor {
        switch (platform) {
            case 'kick':
                return new KickWebhookProcessor(io);
            case 'youtube':
                return new YouTubeWebhookProcessor(io);
            case 'twitch':
                return new TwitchWebhookProcessor(io);
            case 'tiktok':
                return new TikTokWebhookProcessor(io);
            default:
                throw new Error(`Unknown platform: ${platform}`);
        }
    }
}
