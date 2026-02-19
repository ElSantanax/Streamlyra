/** Factory para crear instancias del procesador de webhook apropiado por plataforma */

import { Server } from 'socket.io';
import { Platform } from '../../constants/platforms';
import { KickWebhookProcessor } from './processors/KickWebhookProcessor';
import { TwitchWebhookProcessor } from './processors/TwitchWebhookProcessor';
import { YouTubeWebhookProcessor } from './processors/YouTubeWebhookProcessor';
import { ConnectionService } from '../connection/ConnectionService';
import { ChatManager } from '../core/ChatManager';

type WebhookProcessor = KickWebhookProcessor | TwitchWebhookProcessor | YouTubeWebhookProcessor;

export class WebhookProcessorFactory {
    static getProcessor(platform: Platform, io: Server, connectionService?: ConnectionService, chatManager?: ChatManager): WebhookProcessor {
        if (platform === 'kick') {
            return new KickWebhookProcessor(io);
        }
        if (platform === 'twitch') {
            return new TwitchWebhookProcessor(io);
        }
        if (platform === 'youtube') {
            if (!connectionService || !chatManager) {
                throw new Error('ConnectionService and ChatManager are required for YouTube webhook processing');
            }
            return new YouTubeWebhookProcessor(io, connectionService, chatManager);
        }

        throw new Error(`Platform ${platform} does not have a webhook processor implemented`);
    }
}
