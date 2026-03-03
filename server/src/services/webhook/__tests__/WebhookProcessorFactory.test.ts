import { WebhookProcessorFactory } from '../WebhookProcessorFactory';
import { Server } from 'socket.io';
import { ConnectionService } from '../../connection/ConnectionService';
import { ChatManager } from '../../core/ChatManager';
import { KickWebhookProcessor } from '../processors/KickWebhookProcessor';
import { TwitchWebhookProcessor } from '../processors/TwitchWebhookProcessor';
import { YouTubeWebhookProcessor } from '../processors/YouTubeWebhookProcessor';
import { Platform } from '../../../constants/platforms';

jest.mock('../processors/KickWebhookProcessor');
jest.mock('../processors/TwitchWebhookProcessor');
jest.mock('../processors/YouTubeWebhookProcessor');

describe('WebhookProcessorFactory', () => {
    let mockIo: jest.Mocked<Server>;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockChatManager: jest.Mocked<ChatManager>;

    beforeEach(() => {
        mockIo = {} as unknown as jest.Mocked<Server>;
        mockConnectionService = {} as unknown as jest.Mocked<ConnectionService>;
        mockChatManager = {} as unknown as jest.Mocked<ChatManager>;
    });

    it('debe retornar KickWebhookProcessor para la plataforma kick', () => {
        const processor = WebhookProcessorFactory.getProcessor('kick', mockIo);
        expect(processor).toBeInstanceOf(KickWebhookProcessor);
    });

    it('debe retornar TwitchWebhookProcessor para la plataforma twitch', () => {
        const processor = WebhookProcessorFactory.getProcessor('twitch', mockIo);
        expect(processor).toBeInstanceOf(TwitchWebhookProcessor);
    });

    it('debe retornar YouTubeWebhookProcessor para la plataforma youtube cuando los servicios están presentes', () => {
        const processor = WebhookProcessorFactory.getProcessor('youtube', mockIo, mockConnectionService, mockChatManager);
        expect(processor).toBeInstanceOf(YouTubeWebhookProcessor);
    });

    it('debe lanzar un error para youtube si faltan servicios', () => {
        expect(() => {
            WebhookProcessorFactory.getProcessor('youtube', mockIo);
        }).toThrow('ConnectionService and ChatManager are required for YouTube webhook processing');
    });

    it('debe lanzar un error para plataformas no soportadas', () => {
        expect(() => {
            WebhookProcessorFactory.getProcessor('tiktok' as unknown as Platform, mockIo);
        }).toThrow('Platform tiktok does not have a webhook processor implemented');
    });
});
