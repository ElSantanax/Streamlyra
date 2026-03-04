import { TikTokEventListener } from '../TikTokEventListener';
import { TikTokEventTransformer } from '../../transformers/TikTokEventTransformer';
import { SafeSocketEmitter } from '../../../../utils/SafeSocketEmitter';
import { AnalyticsService } from '../../../core/AnalyticsService';
import { logger } from '../../../../utils/logger';
import { Server } from 'socket.io';
import { TikTokLiveConnection } from 'tiktok-live-connector';

jest.mock('../../transformers/TikTokEventTransformer');
jest.mock('../../../../utils/SafeSocketEmitter');
jest.mock('../../../core/AnalyticsService');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    }
}));

describe('TikTokEventListener', () => {
    let mockTransformer: jest.Mocked<TikTokEventTransformer>;
    let eventListener: TikTokEventListener;
    let mockIo: jest.Mocked<Server>;
    let mockConn: { on: jest.Mock };

    const userId = 'user_tk_1';

    beforeEach(() => {
        mockTransformer = new TikTokEventTransformer() as jest.Mocked<TikTokEventTransformer>;
        eventListener = new TikTokEventListener(mockTransformer);
        mockIo = {} as unknown as jest.Mocked<Server>;
        mockConn = {
            on: jest.fn()
        };

        jest.clearAllMocks();
    });

    describe('setupListeners', () => {
        it('debe registrar y manejar eventos de chat, reportar streamConfirmed una vez', () => {
            eventListener.setupListeners(userId, mockConn as unknown as TikTokLiveConnection, mockIo);

            const chatHandler = mockConn.on.mock.calls.find(call => (call[0] as string) === 'chat')?.[1] as (...args: unknown[]) => void;
            expect(chatHandler).toBeDefined();

            const mockChatEvent = { comment: 'hi' };
            const transformedMock = { platform: 'tiktok', message: 'hi', payload: {} };
            mockTransformer.transformChatMessage.mockReturnValue(transformedMock as unknown as ReturnType<typeof mockTransformer.transformChatMessage>);

            // Primera llamada marca streamConfirmed y emite connectionStatus
            chatHandler(mockChatEvent);

            expect(logger.info).toHaveBeenCalledWith({ userId }, 'TikTok stream confirmed active (first chat message received)');
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'tiktok', 'connected', undefined, true);
            expect(mockTransformer.transformChatMessage).toHaveBeenCalledWith(mockChatEvent);
            expect(SafeSocketEmitter.emitChatMessage).toHaveBeenCalledWith(mockIo, userId, transformedMock, 'tiktok');

            // Segunda llamada no vuelve a emitir connectionStatus
            jest.clearAllMocks();
            chatHandler(mockChatEvent);

            expect(logger.info).not.toHaveBeenCalled();
            expect(SafeSocketEmitter.emitConnectionStatus).not.toHaveBeenCalled();
            expect(SafeSocketEmitter.emitChatMessage).toHaveBeenCalledWith(mockIo, userId, transformedMock, 'tiktok');
        });

        it('debe manejar eventos de gift y confirmar stream solo si es repeatEnd', () => {
            eventListener.setupListeners(userId, mockConn as unknown as TikTokLiveConnection, mockIo);

            const giftHandler = mockConn.on.mock.calls.find(call => (call[0] as string) === 'gift')?.[1] as (...args: unknown[]) => void;
            expect(giftHandler).toBeDefined();

            const giftNotEnd = { repeatEnd: false };
            giftHandler(giftNotEnd);
            // Ignora early return
            expect(SafeSocketEmitter.emitConnectionStatus).not.toHaveBeenCalled();
            expect(mockTransformer.transformGift).not.toHaveBeenCalled();

            const giftEnd = { repeatEnd: true, giftName: 'Rose' };
            const transformedMock = { platform: 'tiktok', payload: {} };
            mockTransformer.transformGift.mockReturnValue(transformedMock as unknown as ReturnType<typeof mockTransformer.transformGift>);

            giftHandler(giftEnd);

            expect(logger.info).toHaveBeenCalledWith({ userId }, 'TikTok stream confirmed active (first gift received)');
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'tiktok', 'connected', undefined, true);
            expect(SafeSocketEmitter.emitChatMessage).toHaveBeenCalledWith(mockIo, userId, transformedMock, 'tiktok');
        });

        it('debe manejar eventos follow y notificar a AnalyticsService', async () => {
            eventListener.setupListeners(userId, mockConn as unknown as TikTokLiveConnection, mockIo);

            const followHandler = mockConn.on.mock.calls.find(call => (call[0] as string) === 'follow')?.[1] as (...args: unknown[]) => void;

            const transformedMock = { platform: 'tiktok', user: 'follower1', payload: {} };
            mockTransformer.transformFollow.mockReturnValue(transformedMock as unknown as ReturnType<typeof mockTransformer.transformFollow>);

            const analyticsUpdated = { lastFollowerName: 'follower1', lastFollowerPlatform: 'tiktok', lastFollowerAt: new Date() };
            (AnalyticsService.updateLastFollower as jest.Mock).mockResolvedValue(analyticsUpdated);

            followHandler({ type: 'follow' });

            // El estado cambió
            expect(logger.info).toHaveBeenCalledWith({ userId }, 'TikTok stream confirmed active (first follow received)');
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'tiktok', 'connected', undefined, true);

            expect(mockTransformer.transformFollow).toHaveBeenCalled();
            expect(SafeSocketEmitter.emitChatMessage).toHaveBeenCalledWith(mockIo, userId, transformedMock, 'tiktok');

            // Promises se resuelven asynconamente
            await new Promise(process.nextTick);

            expect(AnalyticsService.updateLastFollower).toHaveBeenCalledWith(userId, 'tiktok', 'follower1');
            expect(SafeSocketEmitter.emitLastFollowerUpdate).toHaveBeenCalledWith(mockIo, userId, expect.objectContaining({
                name: 'follower1'
            }));
        });

        it('debe loguear error si falla AnalyticsService en evento follow', async () => {
            eventListener.setupListeners(userId, mockConn as unknown as TikTokLiveConnection, mockIo);
            const followHandler = mockConn.on.mock.calls.find(call => (call[0] as string) === 'follow')?.[1] as (...args: unknown[]) => void;

            mockTransformer.transformFollow.mockReturnValue({ platform: 'tiktok', user: 'follower1', payload: {} } as unknown as ReturnType<typeof mockTransformer.transformFollow>);
            const updateError = new Error('Analytics failed');
            (AnalyticsService.updateLastFollower as jest.Mock).mockRejectedValue(updateError);

            followHandler({ type: 'follow' });
            await new Promise(process.nextTick);

            expect(logger.error).toHaveBeenCalledWith(expect.objectContaining({ err: updateError, userId }), 'Error procesando analytics de seguidor en TikTok');
        });

        it('debe manejar eventos roomUser para viewCount y confirmar stream', () => {
            eventListener.setupListeners(userId, mockConn as unknown as TikTokLiveConnection, mockIo);

            const roomUserHandler = mockConn.on.mock.calls.find(call => (call[0] as string) === 'roomUser')?.[1] as (...args: unknown[]) => void;

            roomUserHandler({ viewerCount: 50 });

            expect(logger.info).toHaveBeenCalledWith({ userId }, 'TikTok stream confirmed active (viewer count received)');
            expect(SafeSocketEmitter.emitViewersUpdate).toHaveBeenCalledWith(mockIo, userId, 'tiktok', 50, true);
        });
    });

    describe('streamConfirmed getters and clearers', () => {
        it('debe retornar falso si no esta confirmado y verdadero con la confirmación', () => {
            expect(eventListener.isStreamConfirmed(userId)).toBe(false);

            // Forzamos confirmacion
            eventListener.setupListeners(userId, mockConn as unknown as TikTokLiveConnection, mockIo);
            const roomUserHandler = mockConn.on.mock.calls.find(call => (call[0] as string) === 'roomUser')?.[1] as (...args: unknown[]) => void;
            roomUserHandler({ viewerCount: 50 });

            expect(eventListener.isStreamConfirmed(userId)).toBe(true);
        });

        it('debe remover el flag confirmatorio si se solicita clear', () => {
            eventListener.setupListeners(userId, mockConn as unknown as TikTokLiveConnection, mockIo);
            const roomUserHandler = mockConn.on.mock.calls.find(call => (call[0] as string) === 'roomUser')?.[1] as (...args: unknown[]) => void;
            roomUserHandler({ viewerCount: 50 });

            expect(eventListener.isStreamConfirmed(userId)).toBe(true);

            eventListener.clearStreamConfirmation(userId);
            expect(eventListener.isStreamConfirmed(userId)).toBe(false);
        });
    });
});
