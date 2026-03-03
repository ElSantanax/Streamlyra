import { WebhookProcessor } from '../WebhookProcessor';
import { Server } from 'socket.io';
import { ConnectionService } from '../../connection/ConnectionService';
import { ChatManager } from '../../core/ChatManager';
import { WebhookProcessorFactory } from '../WebhookProcessorFactory';
import { KickWebhookPayload } from '../../../types/kick.types';

jest.mock('../WebhookProcessorFactory');

describe('WebhookProcessor', () => {
    let webhookProcessor: WebhookProcessor;
    let mockIo: jest.Mocked<Server>;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockChatManager: jest.Mocked<ChatManager>;
    let mockProcessor: { process: jest.Mock };

    beforeEach(() => {
        mockIo = {} as unknown as jest.Mocked<Server>;
        mockConnectionService = {} as unknown as jest.Mocked<ConnectionService>;
        mockChatManager = {} as unknown as jest.Mocked<ChatManager>;
        mockProcessor = { process: jest.fn().mockResolvedValue(undefined) };

        (WebhookProcessorFactory.getProcessor as jest.Mock).mockReturnValue(mockProcessor);

        webhookProcessor = new WebhookProcessor(mockIo, mockConnectionService, mockChatManager);
    });

    it('debe procesar un evento de Kick usando la factoría', async () => {
        const payload = {
            broadcaster: { user_id: 123 },
            content: 'test',
            sender: { username: 'testuser' }
        } as unknown as KickWebhookPayload;
        const eventType = 'message';

        await webhookProcessor.processKickEvent(payload, eventType);

        expect(WebhookProcessorFactory.getProcessor).toHaveBeenCalledWith('kick', mockIo);
        expect(mockProcessor.process).toHaveBeenCalledWith(payload, eventType);
    });

    it('debe procesar un evento de Twitch usando la factoría', async () => {
        const payload = { test: 'data' };
        const eventType = 'follow';

        await webhookProcessor.processTwitchEvent(payload, eventType);

        expect(WebhookProcessorFactory.getProcessor).toHaveBeenCalledWith('twitch', mockIo);
        expect(mockProcessor.process).toHaveBeenCalledWith(payload, eventType);
    });

    it('debe procesar un evento de YouTube usando la factoría', async () => {
        const channelId = 'channel123';
        const xmlBody = '<xml></xml>';

        await webhookProcessor.processYouTubeEvent(channelId, xmlBody);

        expect(WebhookProcessorFactory.getProcessor).toHaveBeenCalledWith(
            'youtube',
            mockIo,
            mockConnectionService,
            mockChatManager
        );
        expect(mockProcessor.process).toHaveBeenCalledWith({ channelId, xmlBody });
    });
});
