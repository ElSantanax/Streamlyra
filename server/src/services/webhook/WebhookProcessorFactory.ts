/** Factory para crear instancias del procesador de webhook apropiado por plataforma */

import { Server } from 'socket.io';
import { Platform } from '../../constants/platforms';
import { KickWebhookProcessor } from './processors/KickWebhookProcessor';

type WebhookProcessor = KickWebhookProcessor;

export class WebhookProcessorFactory {
    static getProcessor(platform: Platform, io: Server): WebhookProcessor {
        if (platform === 'kick') {
            return new KickWebhookProcessor(io);
        }

        throw new Error(`Platform ${platform} does not have a webhook processor implemented`);
    }
}
