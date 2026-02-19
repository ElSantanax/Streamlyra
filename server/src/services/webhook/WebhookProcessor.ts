import { Server } from 'socket.io';
import { KickWebhookPayload } from '../../types/kick.types';
import { WebhookProcessorFactory } from './WebhookProcessorFactory';
import { ConnectionService } from '../connection/ConnectionService';

interface WebhookProcessorInterface {
    process(payload: unknown, eventType?: string): Promise<void>;
}

export class WebhookProcessor {
    constructor(private io: Server, private connectionService: ConnectionService) { }

    async processKickEvent(payload: KickWebhookPayload, eventType: string): Promise<void> {
        const processor = WebhookProcessorFactory.getProcessor('kick', this.io) as WebhookProcessorInterface;
        await processor.process(payload, eventType);
    }

    async processTwitchEvent(payload: unknown, eventType: string): Promise<void> {
        const processor = WebhookProcessorFactory.getProcessor('twitch', this.io) as WebhookProcessorInterface;
        await processor.process(payload, eventType);
    }

    async processYouTubeEvent(channelId: string, xmlBody: string): Promise<void> {
        const processor = WebhookProcessorFactory.getProcessor('youtube', this.io, this.connectionService) as WebhookProcessorInterface;
        await processor.process({ channelId, xmlBody });
    }
}
