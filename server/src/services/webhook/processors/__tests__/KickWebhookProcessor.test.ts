import { KickWebhookProcessor } from '../KickWebhookProcessor';
import { Server } from 'socket.io';
import { Connection } from '../../../../models/Connection.model';
import { KickWebhook } from '../../../../models/KickWebhook.model';
import { KickEventTransformer } from '../../../chat/transformers/KickEventTransformer';
import { AnalyticsService } from '../../../core/AnalyticsService';
import { SafeSocketEmitter } from '../../../../utils/SafeSocketEmitter';
import { logger } from '../../../../utils/logger';
import { KickWebhookPayload, KickChatMessagePayload, KickFollowEvent, KickSubscriptionEvent, KickGiftEvent, KickLivestreamStatusEvent } from '../../../../types/kick.types';

jest.mock('../../../../models/Connection.model');
jest.mock('../../../../models/KickWebhook.model');
jest.mock('../../../chat/transformers/KickEventTransformer');
jest.mock('../../../core/AnalyticsService');
jest.mock('../../../../utils/SafeSocketEmitter');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    },
}));

describe('KickWebhookProcessor', () => {
    let kickWebhookProcessor: KickWebhookProcessor;
    let mockIo: jest.Mocked<Server>;
    let mockTransformer: jest.Mocked<KickEventTransformer>;

    beforeEach(() => {
        mockIo = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        } as unknown as jest.Mocked<Server>;

        kickWebhookProcessor = new KickWebhookProcessor(mockIo);
        mockTransformer = (kickWebhookProcessor as unknown as { transformer: jest.Mocked<KickEventTransformer> }).transformer;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe registrar un aviso si no se encuentra el broadcasterKickId', async () => {
        const payload = { data: {} } as unknown as KickWebhookPayload;
        await kickWebhookProcessor.process(payload, 'chat.message.sent');
        expect(logger.warn).toHaveBeenCalledWith(
            expect.objectContaining({ eventType: 'chat.message.sent' }),
            expect.stringContaining('No se pudo encontrar broadcaster.user_id')
        );
    });

    it('debe registrar un aviso si no se encuentra la conexión en la DB', async () => {
        const payload = { broadcaster: { user_id: 123 } } as unknown as KickWebhookPayload;
        (Connection.findOne as jest.Mock).mockResolvedValue(null);

        await kickWebhookProcessor.process(payload, 'chat.message.sent');

        expect(Connection.findOne).toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(
            { broadcasterKickId: '123' },
            expect.stringContaining('No se encontró conexión en DB')
        );
    });

    it('debe registrar un aviso si el webhook no está activo en la DB', async () => {
        const payload = { broadcaster: { user_id: 123 } } as unknown as KickWebhookPayload;
        const mockConnection = { userId: 'user1', providerId: '123' };
        (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
        (KickWebhook.findOne as jest.Mock).mockResolvedValue(null);

        await kickWebhookProcessor.process(payload, 'chat.message.sent');

        expect(KickWebhook.findOne).toHaveBeenCalled();
        expect(logger.warn).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'user1', broadcasterKickId: '123' }),
            expect.stringContaining('Recibido pero ignorado porque isActive=false')
        );
    });

    it('debe procesar un mensaje de chat correctamente', async () => {
        const payload = {
            broadcaster: { user_id: 123 },
            content: 'hola',
            sender: { username: 'testuser' }
        } as unknown as KickChatMessagePayload;

        const mockConnection = { userId: 'user1' };
        const mockWebhook = { broadcasterId: '123', isActive: true };
        const mockChatMessage = { user: 'testuser', message: 'hola' };

        (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
        (KickWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
        (mockTransformer.transformMessage as jest.Mock).mockReturnValue(mockChatMessage);
        (KickWebhook.update as jest.Mock).mockResolvedValue([1]);

        await kickWebhookProcessor.process(payload, 'chat.message.sent');

        expect(mockTransformer.transformMessage).toHaveBeenCalled();
        expect(SafeSocketEmitter.emitChatMessage).toHaveBeenCalledWith(mockIo, 'user1', mockChatMessage, 'kick');
        expect(KickWebhook.update).toHaveBeenCalled();
    });

    it('debe procesar un nuevo seguidor y actualizar analíticas', async () => {
        const payload = {
            broadcaster: { user_id: 123 },
            follower: { username: 'follower1' }
        } as unknown as KickFollowEvent;

        const mockConnection = { userId: 'user1' };
        const mockWebhook = { broadcasterId: '123', isActive: true };
        const mockChatMessage = { user: 'follower1', message: 'is now following!' };

        (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
        (KickWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
        (mockTransformer.transformFollow as jest.Mock).mockReturnValue(mockChatMessage);
        (AnalyticsService.updateLastFollower as jest.Mock).mockResolvedValue({
            lastFollowerName: 'follower1',
            lastFollowerPlatform: 'kick',
            lastFollowerAt: new Date()
        });

        await kickWebhookProcessor.process(payload, 'channel.followed');

        expect(mockTransformer.transformFollow).toHaveBeenCalled();
        expect(AnalyticsService.updateLastFollower).toHaveBeenCalledWith('user1', 'kick', 'follower1');
    });

    it('debe procesar una suscripción', async () => {
        const payload = { broadcaster: { user_id: 123 } } as unknown as KickSubscriptionEvent;
        const mockConnection = { userId: 'user1' };
        const mockWebhook = { broadcasterId: '123', isActive: true };
        const mockChatMessage = { user: 'subber', message: 'subscribed!' };

        (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
        (KickWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
        (mockTransformer.transformSubscription as jest.Mock).mockReturnValue(mockChatMessage);

        await kickWebhookProcessor.process(payload, 'channel.subscription.new');

        expect(mockTransformer.transformSubscription).toHaveBeenCalled();
        expect(SafeSocketEmitter.emitChatMessage).toHaveBeenCalled();
    });

    it('debe procesar un regalo de suscripción', async () => {
        const payload = { broadcaster: { user_id: 123 } } as unknown as KickGiftEvent;
        const mockConnection = { userId: 'user1' };
        const mockWebhook = { broadcasterId: '123', isActive: true };
        const mockChatMessage = { user: 'gifter', message: 'gifted subs!' };

        (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
        (KickWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
        (mockTransformer.transformGift as jest.Mock).mockReturnValue(mockChatMessage);

        await kickWebhookProcessor.process(payload, 'channel.subscription.gifts');

        expect(mockTransformer.transformGift).toHaveBeenCalled();
    });

    it('debe procesar actualización de estado de livestream', async () => {
        const payload = {
            broadcaster: { user_id: 123 },
            is_live: true,
            title: 'Live now'
        } as unknown as KickLivestreamStatusEvent;

        const mockConnection = { userId: 'user1' };
        const mockWebhook = { broadcasterId: '123', isActive: true };

        (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
        (KickWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);

        await kickWebhookProcessor.process(payload, 'livestream.status.updated');

        expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(
            mockIo, 'user1', 'kick', 'connected', 'En vivo', true
        );
    });

    it('debe manejar errores fatales silenciosamente pero registrándolos', async () => {
        const payload = { broadcaster: { user_id: 123 } } as unknown as KickWebhookPayload;
        (Connection.findOne as jest.Mock).mockRejectedValue(new Error('DB Error'));

        await kickWebhookProcessor.process(payload, 'chat.message.sent');

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({ err: expect.any(Error) }),
            'Error fatal processing Kick webhook'
        );
    });
});
