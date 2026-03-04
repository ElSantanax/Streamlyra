import { Server } from 'socket.io';
import { TikTokDiscoveryManager } from '../TikTokDiscoveryManager';
import { TikTokConnectionManager } from '../TikTokConnectionManager';
import { TikTokConnectionStateManager } from '../TikTokConnectionStateManager';
import { TikTokErrorHandler } from '../TikTokErrorHandler';
import { TikTokEventListener } from '../TikTokEventListener';
import { ConnectionService } from '../../../connection/ConnectionService';
import { SafeSocketEmitter } from '../../../../utils/SafeSocketEmitter';
import { retryWithIntervalAndLimit } from '../../../../utils/retryWithInterval';
import { logger } from '../../../../utils/logger';
import { TikTokLiveConnection } from 'tiktok-live-connector';
import { TikTokErrorInfo } from '../TikTokErrorHandler';
import crypto from 'crypto';

jest.mock('crypto', () => ({
    randomUUID: jest.fn()
}));

jest.mock('../../../../utils/retryWithInterval');
jest.mock('../../../../utils/SafeSocketEmitter');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    }
}));
jest.mock('../../../../config/tiktok.polling.config', () => ({
    TikTokPollingConfig: {
        AUTO_DISCOVERY_INTERVAL_MS: 1000,
        AUTO_DISCOVERY_MAX_ATTEMPTS: 5,
        RECONNECTION_DELAY_MS: 1000
    }
}));

describe('TikTokDiscoveryManager', () => {
    let discoveryManager: TikTokDiscoveryManager;
    let mockConnectionManager: jest.Mocked<TikTokConnectionManager>;
    let mockStateManager: jest.Mocked<TikTokConnectionStateManager>;
    let mockErrorHandler: jest.Mocked<TikTokErrorHandler>;
    let mockEventListener: jest.Mocked<TikTokEventListener>;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockIo: jest.Mocked<Server>;

    const userId = 'user123';
    const username = 'testuser';

    beforeEach(() => {
        mockConnectionManager = {
            connect: jest.fn(),
            disconnect: jest.fn()
        } as unknown as jest.Mocked<TikTokConnectionManager>;
        mockStateManager = {
            setFlowId: jest.fn(),
            getFlowId: jest.fn(),
            setDiscoveryCleanup: jest.fn(),
            getAutoAttempts: jest.fn(),
            incrementAutoAttempts: jest.fn(),
            stopDiscoveryLoop: jest.fn(),
            setActiveConnection: jest.fn(),
            setConnecting: jest.fn(),
            hasState: jest.fn(),
            setManualMode: jest.fn(),
            removeActiveConnection: jest.fn(),
            clearState: jest.fn()
        } as unknown as jest.Mocked<TikTokConnectionStateManager>;
        mockErrorHandler = {
            categorizeError: jest.fn()
        } as unknown as jest.Mocked<TikTokErrorHandler>;
        mockEventListener = {
            isStreamConfirmed: jest.fn(),
            setupListeners: jest.fn()
        } as unknown as jest.Mocked<TikTokEventListener>;
        mockConnectionService = {
            getAccount: jest.fn()
        } as unknown as jest.Mocked<ConnectionService>;
        mockIo = {} as unknown as jest.Mocked<Server>;

        discoveryManager = new TikTokDiscoveryManager(
            mockConnectionManager,
            mockStateManager,
            mockErrorHandler,
            mockEventListener,
            mockConnectionService
        );

        jest.clearAllMocks();
    });

    describe('setupAutoDiscovery', () => {
        it('debe iniciar el loop de autodiscovery y configurar el cleanup', async () => {
            const mockCleanup = jest.fn();
            (retryWithIntervalAndLimit as jest.Mock).mockReturnValue(mockCleanup);

            const onReconnect = jest.fn();
            await discoveryManager.setupAutoDiscovery(userId, username, mockIo, onReconnect);

            expect(mockStateManager.setFlowId).toHaveBeenCalled();
            expect(retryWithIntervalAndLimit).toHaveBeenCalled();
            expect(mockStateManager.setDiscoveryCleanup).toHaveBeenCalledWith(userId, mockCleanup);
        });

        it('debe manejar error de discovery mediante onError hook', async () => {
            (retryWithIntervalAndLimit as jest.Mock).mockImplementation((_fn, options) => {
                options.onError(new Error('Test error'));
                return jest.fn();
            });

            mockErrorHandler.categorizeError.mockReturnValue({
                type: 'not_live',
                isPermanent: false,
                userMessage: 'Sin Live',
                logMessage: 'Not live'
            } as TikTokErrorInfo);

            await discoveryManager.setupAutoDiscovery(userId, username, mockIo, jest.fn());

            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'tiktok', 'waiting_stream', 'Sin Live');
        });

        it('debe detener discovery si el error es permanente', async () => {
            (retryWithIntervalAndLimit as jest.Mock).mockImplementation((_fn, options) => {
                options.onError(new Error('Permanent error'));
                return jest.fn();
            });

            mockErrorHandler.categorizeError.mockReturnValue({
                type: 'user_not_found',
                isPermanent: true,
                userMessage: 'No existe',
                logMessage: 'User not found'
            } as TikTokErrorInfo);

            await discoveryManager.setupAutoDiscovery(userId, username, mockIo, jest.fn());

            expect(mockStateManager.clearState).toHaveBeenCalledWith(userId);
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'tiktok', 'error', 'No existe');
        });

        it('debe manejar intentos agotados', async () => {
            (retryWithIntervalAndLimit as jest.Mock).mockImplementation((_fn, options) => {
                options.onMaxAttemptsReached();
                return jest.fn();
            });

            await discoveryManager.setupAutoDiscovery(userId, username, mockIo, jest.fn());

            expect(mockStateManager.setManualMode).toHaveBeenCalledWith(userId, true);
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'tiktok', 'waiting_stream', 'Sin Live');
        });
    });

    describe('attemptDiscovery', () => {
        it('debe abortar si el flowId ya no es válido', async () => {
            const flowId = 'flow1';
            (crypto.randomUUID as jest.Mock).mockReturnValue(flowId);
            mockStateManager.hasState.mockReturnValue(true);
            mockStateManager.getFlowId.mockReturnValue('flow-diff'); // Diferente

            // Accedemos a método privado mediante cast
            await (discoveryManager as unknown as { attemptDiscovery: (...args: unknown[]) => Promise<void> }).attemptDiscovery(userId, username, flowId, mockIo, jest.fn());

            expect(mockConnectionManager.connect).not.toHaveBeenCalled();
            expect(logger.debug).toHaveBeenCalledWith(expect.any(Object), 'TikTok: Aborting stale discovery attempt');
        });

        it('debe conectar exitosamente y configurar listeners si el flow es persistente', async () => {
            const flowId = 'flow1';
            (crypto.randomUUID as jest.Mock).mockReturnValue(flowId);
            mockStateManager.hasState.mockReturnValue(true);
            mockStateManager.getFlowId.mockReturnValue(flowId);

            const mockConn = { on: jest.fn() };
            mockConnectionManager.connect.mockResolvedValue(mockConn as unknown as TikTokLiveConnection);
            mockConnectionService.getAccount.mockResolvedValue({ providerUsername: username } as unknown as NonNullable<Awaited<ReturnType<typeof mockConnectionService.getAccount>>>);
            mockEventListener.isStreamConfirmed.mockReturnValue(false);

            await (discoveryManager as unknown as { attemptDiscovery: (...args: unknown[]) => Promise<void> }).attemptDiscovery(userId, username, flowId, mockIo, jest.fn());

            expect(mockStateManager.stopDiscoveryLoop).toHaveBeenCalledWith(userId);
            expect(mockStateManager.setActiveConnection).toHaveBeenCalledWith(userId, mockConn);
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'tiktok', 'connected', 'Conectado', false);
            expect(mockEventListener.setupListeners).toHaveBeenCalledWith(userId, mockConn, mockIo);
        });

        it('debe desconectar si la cuenta cambió durante el proceso de conexión', async () => {
            const flowId = 'flow1';
            (crypto.randomUUID as jest.Mock).mockReturnValue(flowId);
            mockStateManager.hasState.mockReturnValue(true);
            mockStateManager.getFlowId.mockReturnValue(flowId);

            const mockConn = { on: jest.fn() };
            mockConnectionManager.connect.mockResolvedValue(mockConn as unknown as TikTokLiveConnection);
            mockConnectionService.getAccount.mockResolvedValue({ providerUsername: 'different-user' } as unknown as NonNullable<Awaited<ReturnType<typeof mockConnectionService.getAccount>>>);

            await (discoveryManager as unknown as { attemptDiscovery: (...args: unknown[]) => Promise<void> }).attemptDiscovery(userId, username, flowId, mockIo, jest.fn());

            expect(mockConnectionManager.disconnect).toHaveBeenCalledWith(mockConn);
            expect(mockStateManager.setActiveConnection).not.toHaveBeenCalled();
        });
    });

    describe('boostDiscovery', () => {
        it('debe intentar discovery directo y emitir waiting_stream si falla', async () => {
            const flowId = 'flow-boost';
            (crypto.randomUUID as jest.Mock).mockReturnValue(flowId);
            mockStateManager.hasState.mockReturnValue(true);
            mockStateManager.getFlowId.mockReturnValue(flowId);

            mockConnectionManager.connect.mockRejectedValue(new Error('Fail'));

            await discoveryManager.boostDiscovery(userId, username, mockIo, jest.fn());

            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'tiktok', 'waiting_stream', 'Live no detectado');
            expect(mockStateManager.setConnecting).toHaveBeenCalledWith(userId, false);
        });
    });

    describe('disconnection handling', () => {
        it('debe disparar onReconnect si el usuario pierde la conexión pero mantiene la cuenta', async () => {
            jest.useFakeTimers();
            const flowId = 'flow1';
            const mockConn = { on: jest.fn() };
            const onReconnect = jest.fn();

            (discoveryManager as unknown as {
                setupDisconnectionHandler: (userId: string, username: string, connection: unknown, flowId: string, onReconnect: () => void) => void
            }).setupDisconnectionHandler(userId, username, mockConn, flowId, onReconnect);

            const discoHandler = mockConn.on.mock.calls.find(c => c[0] === 'disconnected')?.[1] as () => Promise<void>;

            mockStateManager.getFlowId.mockReturnValue(flowId);
            mockConnectionService.getAccount.mockResolvedValue({ providerUsername: username } as unknown as NonNullable<Awaited<ReturnType<typeof mockConnectionService.getAccount>>>);

            await discoHandler();

            expect(mockStateManager.removeActiveConnection).toHaveBeenCalledWith(userId);

            jest.runAllTimers();
            expect(onReconnect).toHaveBeenCalled();
            jest.useRealTimers();
        });
    });
});
