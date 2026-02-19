/** Factory para crear instancias del procesador de webhook apropiado por plataforma */

import { Server } from 'socket.io';
import { Platform } from '../../constants/platforms';
import { KickWebhookProcessor } from './processors/KickWebhookProcessor';
import { TwitchWebhookProcessor } from './processors/TwitchWebhookProcessor';
import { YouTubeWebhookProcessor } from './processors/YouTubeWebhookProcessor';
import { ConnectionService } from '../connection/ConnectionService';

type WebhookProcessor = KickWebhookProcessor | TwitchWebhookProcessor | YouTubeWebhookProcessor;

export class WebhookProcessorFactory {
    static getProcessor(platform: Platform, io: Server, connectionService?: ConnectionService): WebhookProcessor {
        if (platform === 'kick') {
            return new KickWebhookProcessor(io);
        }
        if (platform === 'twitch') {
            return new TwitchWebhookProcessor(io);
        }
        if (platform === 'youtube') {
            if (!connectionService) {
                throw new Error('ConnectionService is required for YouTube webhook processing');
            }
            return new YouTubeWebhookProcessor(io, connectionService);
        }

        throw new Error(`Platform ${platform} does not have a webhook processor implemented`);
    }
}
