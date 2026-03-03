import { TwitchWebhookProcessor } from '../TwitchWebhookProcessor';
import { Server } from 'socket.io';
import { Connection } from '../../../../models/Connection.model';
import { TwitchWebhook } from '../../../../models/TwitchWebhook.model';
import { TwitchEventTransformer } from '../../../chat/transformers/TwitchEventTransformer';
import { AnalyticsService } from '../../../core/AnalyticsService';
import { SafeSocketEmitter } from '../../../../utils/SafeSocketEmitter';
import { logger } from '../../../../utils/logger';
import { TwitchEventSubNotificationPayload, TwitchChatMessageEventSub, TwitchFollowEventSub, TwitchRaidEventSub } from '../../../../types/twitch.types';

jest.mock('../../../../models/Connection.model');
jest.mock('../../../../models/TwitchWebhook.model');
jest.mock('../../../chat/transformers/TwitchEventTransformer');
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

describe('TwitchWebhookProcessor', () => {
    let twitchWebhookProcessor: TwitchWebhookProcessor;
    let mockIo: jest.Mocked<Server>;
    let mockTransformer: jest.Mocked<TwitchEventTransformer>;

    beforeEach(() => {
        mockIo = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        } as unknown as jest.Mocked<Server>;

        twitchWebhookProcessor = new TwitchWebhookProcessor(mockIo);
        // Accedemos a la propiedad privada para el mock usando index signature o casting controlado a unknown
        mockTransformer = (twitchWebhookProcessor as unknown as { transformer: jest.Mocked<TwitchEventTransformer> }).transformer;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('debe registrar un aviso si no se encuentra el broadcasterId', async () => {
        const payload = {
            subscription: {
                condition: {} as Record<string, string>
            }
        } as TwitchEventSubNotificationPayload;

        await twitchWebhookProcessor.process(payload, 'channel.follow');

        expect(logger.warn).toHaveBeenCalledWith(
            expect.objectContaining({ eventType: 'channel.follow' }),
            expect.stringContaining('No se pudo identificar el canal')
        );
    });

    it('debe registrar un aviso si no se encuentra la conexión', async () => {
        const payload = {
            subscription: {
                condition: { broadcaster_user_id: '123' } as Record<string, string>
            }
        } as TwitchEventSubNotificationPayload;

        (Connection.findOne as jest.Mock).mockResolvedValue(null);

        await twitchWebhookProcessor.process(payload, 'channel.follow');

        expect(logger.debug).toHaveBeenCalledWith({ broadcasterId: '123' }, 'No connection found for Twitch broadcaster');
    });

    it('debe registrar un aviso si el webhook no está habilitado en la DB', async () => {
        const payload = {
            subscription: {
                condition: { broadcaster_user_id: '123' } as Record<string, string>
            }
        } as TwitchEventSubNotificationPayload;

        const mockConnection = { userId: 'user1' };
        (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
        (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(null);

        await twitchWebhookProcessor.process(payload, 'channel.follow');

        expect(logger.debug).toHaveBeenCalledWith(
            expect.objectContaining({ userId: 'user1', broadcasterId: '123' }),
            expect.stringContaining('Twitch webhook ignorado')
        );
    });

    it('debe procesar un mensaje de chat correctamente', async () => {
        const event: Partial<TwitchChatMessageEventSub> = {
            message: { text: 'hola', fragments: [] }
        };
        const payload = {
            subscription: {
                condition: { broadcaster_user_id: '123' } as Record<string, string>,
                type: 'channel.chat.message'
            },
            event
        } as TwitchEventSubNotificationPayload;

        const mockConnection = { userId: 'user1' };
        const mockWebhook = { broadcasterId: '123', status: 'enabled' };
        const mockChatMessage = { user: 'testuser', message: 'hola' };

        (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
        (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
        (mockTransformer.transformEventSubChatMessage as jest.Mock).mockReturnValue(mockChatMessage);
        (TwitchWebhook.update as jest.Mock).mockResolvedValue([1]);

        await twitchWebhookProcessor.process(payload, 'channel.chat.message');

        expect(mockTransformer.transformEventSubChatMessage).toHaveBeenCalled();
        expect(SafeSocketEmitter.emitChatMessage).toHaveBeenCalledWith(mockIo, 'user1', mockChatMessage, 'twitch');
    });

    it('debe procesar un seguimiento y actualizar analíticas', async () => {
        const event: Partial<TwitchFollowEventSub> = {
            user_name: 'follower1'
        };
        const payload = {
            subscription: {
                condition: { broadcaster_user_id: '123' } as Record<string, string>,
                type: 'channel.follow'
            },
            event
        } as TwitchEventSubNotificationPayload;

        const mockConnection = { userId: 'user1' };
        const mockWebhook = { broadcasterId: '123', status: 'enabled' };
        const mockChatMessage = { user: 'follower1', message: 'followed!' };

        (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
        (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
        (mockTransformer.transformEventSubFollow as jest.Mock).mockReturnValue(mockChatMessage);
        (AnalyticsService.updateLastFollower as jest.Mock).mockResolvedValue({
            lastFollowerName: 'follower1',
            lastFollowerPlatform: 'twitch',
            lastFollowerAt: new Date()
        });

        await twitchWebhookProcessor.process(payload, 'channel.follow');

        expect(mockTransformer.transformEventSubFollow).toHaveBeenCalled();
        expect(AnalyticsService.updateLastFollower).toHaveBeenCalledWith('user1', 'twitch', 'follower1');
    });

    it('debe procesar un raid y actualizar analíticas', async () => {
        const event: Partial<TwitchRaidEventSub> = {
            from_broadcaster_user_name: 'raider',
            viewers: 10
        };
        const payload = {
            subscription: {
                condition: { broadcaster_user_id: '123' } as Record<string, string>,
                type: 'channel.raid'
            },
            event
        } as TwitchEventSubNotificationPayload;

        const mockConnection = { userId: 'user1' };
        const mockWebhook = { broadcasterId: '123', status: 'enabled' };
        const mockChatMessage = { user: 'raider', message: 'raided!' };

        (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
        (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
        (mockTransformer.transformEventSubRaid as jest.Mock).mockReturnValue(mockChatMessage);
        (AnalyticsService.updateLastRaid as jest.Mock).mockResolvedValue({
            lastRaidName: 'raider',
            lastRaidPlatform: 'twitch',
            lastRaidViewers: 10,
            lastRaidAt: new Date()
        });

        await twitchWebhookProcessor.process(payload, 'channel.raid');

        expect(AnalyticsService.updateLastRaid).toHaveBeenCalledWith('user1', 'twitch', 'raider', 10);
    });

    it('debe procesar el estado online', async () => {
        const payload = {
            subscription: {
                condition: { broadcaster_user_id: '123' } as Record<string, string>
            },
            event: {}
        } as TwitchEventSubNotificationPayload;

        const mockConnection = { userId: 'user1' };
        const mockWebhook = { broadcasterId: '123', status: 'enabled' };

        (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
        (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);

        await twitchWebhookProcessor.process(payload, 'stream.online');

        expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(
            mockIo, 'user1', 'twitch', 'connected', 'En vivo', true
        );
    });

    it('debe procesar el estado offline', async () => {
        const payload = {
            subscription: {
                condition: { broadcaster_user_id: '123' } as Record<string, string>
            },
            event: {}
        } as TwitchEventSubNotificationPayload;

        const mockConnection = { userId: 'user1' };
        const mockWebhook = { broadcasterId: '123', status: 'enabled' };

        (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
        (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);

        await twitchWebhookProcessor.process(payload, 'stream.offline');

        expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(
            mockIo, 'user1', 'twitch', 'connected', 'Desconectado', false
        );
    });

    it('debe manejar errores fatales', async () => {
        const payload = {
            subscription: {
                condition: { broadcaster_user_id: '123' } as Record<string, string>
            }
        } as TwitchEventSubNotificationPayload;

        (Connection.findOne as jest.Mock).mockRejectedValue(new Error('DB Error'));

        await twitchWebhookProcessor.process(payload, 'channel.follow');

        expect(logger.error).toHaveBeenCalledWith(
            expect.objectContaining({ err: expect.any(Error) }),
            'Error fatal procesando Twitch webhook'
        );
    });
});
