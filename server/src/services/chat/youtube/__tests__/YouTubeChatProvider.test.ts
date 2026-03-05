import { Server } from 'socket.io';
import { YouTubeChatProvider } from '../YouTubeChatProvider';
import { ConnectionService } from '../../../connection/ConnectionService';
import { YouTubeConnectionStateManager } from '../YouTubeConnectionStateManager';
import { YouTubeDiscoveryLoop } from '../YouTubeDiscoveryLoop';
import { YouTubeChatPoller } from '../YouTubeChatPoller';
import { YouTubeViewerPoller } from '../YouTubeViewerPoller';
import { youtubePubSubService } from '../YouTubePubSubService';
import { SafeSocketEmitter } from '../../../../utils/SafeSocketEmitter';
import { YouTubeStreamContext } from '../../../../models/YouTubeStreamContext.model';

jest.mock('../YouTubeConnectionStateManager');
jest.mock('../YouTubeDiscoveryLoop');
jest.mock('../YouTubePubSubService');
jest.mock('../../../../utils/SafeSocketEmitter');
jest.mock('../../../../models/YouTubeStreamContext.model');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }
}));

describe('YouTubeChatProvider', () => {
    let provider: YouTubeChatProvider;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockIo: jest.Mocked<Server>;
    let mockStateManager: jest.Mocked<YouTubeConnectionStateManager>;
    let mockDiscoveryLoop: jest.Mocked<YouTubeDiscoveryLoop>;

    const userId = 'user_yt_test';
    const account = { providerId: 'channel_id_1' };

    beforeEach(() => {
        mockConnectionService = {
            getAccount: jest.fn(),
            updateChatroomId: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<ConnectionService>;

        mockIo = {} as unknown as jest.Mocked<Server>;

        (youtubePubSubService.subscribe as jest.Mock).mockResolvedValue(undefined);
        (youtubePubSubService.unsubscribe as jest.Mock).mockResolvedValue(undefined);

        provider = new YouTubeChatProvider(mockConnectionService);

        mockStateManager = (provider as unknown as { stateManager: jest.Mocked<YouTubeConnectionStateManager> }).stateManager;
        mockDiscoveryLoop = (provider as unknown as { discoveryLoop: jest.Mocked<YouTubeDiscoveryLoop> }).discoveryLoop;

        jest.clearAllMocks();
    });

    describe('connect', () => {
        it('debería salir si ya está conectado', async () => {
            mockStateManager.hasActiveConnection.mockReturnValue(true);

            await provider.connect(userId, mockIo);

            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(
                mockIo, userId, 'youtube', 'connected', 'Conectado', true
            );
            expect(mockConnectionService.getAccount).not.toHaveBeenCalled();
        });

        it('debería salir si la conexión está en curso', async () => {
            mockStateManager.hasActiveConnection.mockReturnValue(false);
            mockStateManager.isConnecting.mockReturnValue(true);

            await provider.connect(userId, mockIo);

            expect(mockConnectionService.getAccount).not.toHaveBeenCalled();
        });

        it('debería iniciar el descubrimiento automático si no se encuentra una cuenta', async () => {
            mockConnectionService.getAccount.mockResolvedValue(null);

            await provider.connect(userId, mockIo);

            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(
                mockIo, userId, 'youtube', 'error', 'Cuenta no vinculada', false
            );
        });

        it('debería iniciar el descubrimiento automático después de una búsqueda de cuenta exitosa', async () => {
            mockConnectionService.getAccount.mockResolvedValue(account as unknown as NonNullable<Awaited<ReturnType<typeof mockConnectionService.getAccount>>>);
            mockStateManager.hasActiveConnection.mockReturnValue(false);
            mockStateManager.isConnecting.mockReturnValue(false);

            await provider.connect(userId, mockIo);

            expect(mockStateManager.clearState).toHaveBeenCalledWith(userId);
            expect(youtubePubSubService.subscribe).toHaveBeenCalledWith(userId, account.providerId);
            expect(mockDiscoveryLoop.startAutoDiscovery).toHaveBeenCalled();
        });
    });

    describe('boostDiscovery', () => {
        it('debería llamar a performManualDiscovery', async () => {
            mockConnectionService.getAccount.mockResolvedValue(account as unknown as NonNullable<Awaited<ReturnType<typeof mockConnectionService.getAccount>>>);

            await provider.boostDiscovery(userId, mockIo);

            expect(mockStateManager.setManualMode).toHaveBeenCalledWith(userId, true);
            expect(mockDiscoveryLoop.performManualDiscovery).toHaveBeenCalled();
        });

        it('debería forzar la actualización si se proporciona el flag', async () => {
            mockConnectionService.getAccount.mockResolvedValue(account as unknown as NonNullable<Awaited<ReturnType<typeof mockConnectionService.getAccount>>>);

            await provider.boostDiscovery(userId, mockIo, true);

            expect(mockStateManager.clearState).toHaveBeenCalledWith(userId);
            expect(mockStateManager.setConnecting).toHaveBeenCalledWith(userId, true);
        });
    });

    describe('handleBroadcastFound', () => {
        it('debería configurar el polling después de encontrar el broadcast', async () => {
            const broadcast = { id: 'v1', snippet: { liveChatId: 'c1', channelId: 'ch1' } };
            const mockChatPoller = { startPolling: jest.fn() };
            const mockViewerPoller = { startPolling: jest.fn() };

            mockStateManager.getChatPoller.mockReturnValue(mockChatPoller as unknown as YouTubeChatPoller);
            mockStateManager.getViewerPoller.mockReturnValue(mockViewerPoller as unknown as YouTubeViewerPoller);

            await (provider as unknown as { handleBroadcastFound: (...args: unknown[]) => Promise<void> }).handleBroadcastFound(userId, broadcast, mockIo);

            expect(YouTubeStreamContext.update).toHaveBeenCalled();
            expect(YouTubeStreamContext.upsert).toHaveBeenCalled();
            expect(mockStateManager.stopDiscoveryLoop).toHaveBeenCalledWith(userId);
            expect(mockStateManager.markAsConnected).toHaveBeenCalledWith(userId);
            expect(mockChatPoller.startPolling).toHaveBeenCalled();
            expect(mockViewerPoller.startPolling).toHaveBeenCalled();
        });
    });

    describe('disconnect', () => {
        it('debería limpiar el estado', async () => {
            await provider.disconnect(userId);
            expect(mockStateManager.clearState).toHaveBeenCalledWith(userId);
            expect(mockStateManager.setConnecting).toHaveBeenCalledWith(userId, false);
        });
    });

    describe('onAccountDeleted', () => {
        it('debería realizar una limpieza completa', async () => {
            mockConnectionService.getAccount.mockResolvedValue(account as unknown as NonNullable<Awaited<ReturnType<typeof mockConnectionService.getAccount>>>);

            await provider.onAccountDeleted(userId);

            expect(mockStateManager.clearState).toHaveBeenCalledWith(userId);
            expect(youtubePubSubService.unsubscribe).toHaveBeenCalledWith(userId, account.providerId);
            expect(YouTubeStreamContext.destroy).toHaveBeenCalled();
        });
    });
});
