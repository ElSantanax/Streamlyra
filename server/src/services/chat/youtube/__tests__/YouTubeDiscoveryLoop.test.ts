import { Server } from 'socket.io';
import { YouTubeBroadcast } from '../../../../types/youtube.types';
import { YouTubeDiscoveryLoop } from '../YouTubeDiscoveryLoop';
import { YouTubeConnectionStateManager } from '../YouTubeConnectionStateManager';
import { ConnectionService } from '../../../connection/ConnectionService';
import { YouTubeBroadcastDiscovery } from '../YouTubeBroadcastDiscovery';
import { SafeSocketEmitter } from '../../../../utils/SafeSocketEmitter';
import { YouTubeError, YouTubeErrorType } from '../YouTubeError';

jest.mock('../YouTubeBroadcastDiscovery');
jest.mock('../../../../utils/SafeSocketEmitter', () => ({
    SafeSocketEmitter: {
        emitConnectionStatus: jest.fn(),
        emit: jest.fn(),
        emitChatMessage: jest.fn(),
        emitViewersUpdate: jest.fn(),
        emitError: jest.fn()
    }
}));
jest.mock('../../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }
}));

describe('YouTubeDiscoveryLoop', () => {
    let loop: YouTubeDiscoveryLoop;
    let mockStateManager: jest.Mocked<YouTubeConnectionStateManager>;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockOnBroadcastFound: jest.Mock;
    let mockBroadcastDiscovery: jest.Mocked<YouTubeBroadcastDiscovery>;
    let mockIo: jest.Mocked<Server>;

    const userId = 'user_yt_1';
    const account = { providerId: 'channel_1' };

    beforeEach(() => {
        mockStateManager = {
            isConnecting: jest.fn().mockReturnValue(true),
            getAutoAttempts: jest.fn().mockReturnValue(0),
            incrementAutoAttempts: jest.fn().mockImplementation(() => {
                const current = mockStateManager.getAutoAttempts(userId);
                mockStateManager.getAutoAttempts.mockReturnValue(current + 1);
            }),
            isManualMode: jest.fn().mockReturnValue(false),
            setDiscoveryCleanup: jest.fn(),
            stopDiscoveryLoop: jest.fn(),
            setWaitingMode: jest.fn(),
            clearState: jest.fn()
        } as unknown as jest.Mocked<YouTubeConnectionStateManager>;

        mockConnectionService = {
            getValidAccessToken: jest.fn().mockResolvedValue('fake-token')
        } as unknown as jest.Mocked<ConnectionService>;

        mockOnBroadcastFound = jest.fn().mockResolvedValue(undefined);
        mockIo = {} as unknown as jest.Mocked<Server>;

        loop = new YouTubeDiscoveryLoop(
            mockStateManager,
            mockConnectionService,
            mockOnBroadcastFound
        );

        // Access private member to get mock
        mockBroadcastDiscovery = (loop as unknown as { broadcastDiscovery: jest.Mocked<YouTubeBroadcastDiscovery> }).broadcastDiscovery;

        jest.clearAllMocks();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('startAutoDiscovery', () => {
        it('debería detenerse y programar reintento si no se encuentra el broadcast', async () => {
            mockBroadcastDiscovery.findLiveBroadcast.mockResolvedValue(null);

            await loop.startAutoDiscovery(userId, account, mockIo);

            // Permitir que se completen todas las microtareas
            await Promise.resolve(); // startAutoDiscovery -> runDiscoveryLoop
            await Promise.resolve(); // runDiscoveryLoop -> attemptDiscovery
            await Promise.resolve(); // attemptDiscovery -> findLiveBroadcast
            await Promise.resolve(); // catch block -> handleDiscoveryError

            expect(mockStateManager.incrementAutoAttempts).toHaveBeenCalledWith(userId);
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(
                mockIo, userId, 'youtube', 'connecting', 'Buscando... (1/6)', false
            );

            // Debería haber programado un reintento
            expect(jest.getTimerCount()).toBe(1);
        });

        it('debería detenerse y salir si se alcanza el máximo de intentos', async () => {
            mockBroadcastDiscovery.findLiveBroadcast.mockResolvedValue(null);
            mockStateManager.getAutoAttempts.mockReturnValue(100); // Supera 6

            await loop.startAutoDiscovery(userId, account, mockIo);
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();
            await Promise.resolve();

            expect(mockStateManager.setWaitingMode).toHaveBeenCalledWith(userId);
            expect(jest.getTimerCount()).toBe(1); // El temporizador de standby
        });

        it('debería llamar a onBroadcastFound si se descubre uno', async () => {
            const mockBroadcast = { id: 'v1', snippet: { liveChatId: 'c1' } };
            mockBroadcastDiscovery.findLiveBroadcast.mockResolvedValue(mockBroadcast as unknown as YouTubeBroadcast);

            await loop.startAutoDiscovery(userId, account, mockIo);
            await Promise.resolve();

            expect(mockOnBroadcastFound).toHaveBeenCalledWith(userId, mockBroadcast, mockIo);
        });
    });

    describe('performManualDiscovery', () => {
        it('debería omitir la caché y llamar a discovery', async () => {
            const mockBroadcast = { id: 'v1', snippet: { liveChatId: 'c1' } };
            mockBroadcastDiscovery.findLiveBroadcast.mockResolvedValue(mockBroadcast as unknown as YouTubeBroadcast);
            mockStateManager.isManualMode.mockReturnValue(true);

            await loop.performManualDiscovery(userId, account, mockIo);

            expect(mockBroadcastDiscovery.findLiveBroadcast).toHaveBeenCalledWith(
                'fake-token', account.providerId, true
            );
            expect(mockOnBroadcastFound).toHaveBeenCalled();
        });

        it('debería notificar waiting_stream y lanzar error si no se encuentra manualmente', async () => {
            mockBroadcastDiscovery.findLiveBroadcast.mockResolvedValue(null);
            mockStateManager.isManualMode.mockReturnValue(true);

            await expect(loop.performManualDiscovery(userId, account, mockIo))
                .rejects.toThrow(YouTubeError);

            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(
                mockIo, userId, 'youtube', 'waiting_stream', 'Sin Live público', false
            );
        });
    });

    describe('error handling', () => {
        it('debería manejar QUOTA_EXCEEDED limpiando el estado', async () => {
            mockBroadcastDiscovery.findLiveBroadcast.mockRejectedValue(
                new YouTubeError(YouTubeErrorType.QUOTA_EXCEEDED, 'Quota')
            );

            await (loop as unknown as { attemptDiscovery: (...args: unknown[]) => Promise<void> }).attemptDiscovery(userId, account, mockIo).catch(() => { });
            (loop as unknown as { handleDiscoveryError: (...args: unknown[]) => void }).handleDiscoveryError(new YouTubeError(YouTubeErrorType.QUOTA_EXCEEDED, 'Quota'), userId, mockIo);

            expect(mockStateManager.clearState).toHaveBeenCalledWith(userId);
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(
                mockIo, userId, 'youtube', 'error', 'Cuotas agotadas', false
            );
        });

        it('debería manejar INVALID_TOKEN', async () => {
            (loop as unknown as { handleDiscoveryError: (...args: unknown[]) => void }).handleDiscoveryError(new YouTubeError(YouTubeErrorType.INVALID_TOKEN, 'Token'), userId, mockIo);

            expect(mockStateManager.clearState).toHaveBeenCalledWith(userId);
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(
                mockIo, userId, 'youtube', 'error', 'Token inválido', false
            );
        });
    });
});
