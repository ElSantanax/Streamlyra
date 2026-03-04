import { TikTokChatProvider } from '../TikTokChatProvider';
import { TikTokConnectionStateManager } from '../TikTokConnectionStateManager';
import { TikTokConnectionManager } from '../TikTokConnectionManager';
import { TikTokEventListener } from '../TikTokEventListener';
import { TikTokDiscoveryManager } from '../TikTokDiscoveryManager';
import { SafeSocketEmitter } from '../../../../utils/SafeSocketEmitter';
import { ConnectionService } from '../../../connection/ConnectionService';
import { logger } from '../../../../utils/logger';
import { Server } from 'socket.io';
import { TikTokLiveConnection } from 'tiktok-live-connector';

jest.mock('../TikTokConnectionStateManager');
jest.mock('../TikTokConnectionManager');
jest.mock('../TikTokEventListener');
jest.mock('../TikTokErrorHandler');
jest.mock('../TikTokDiscoveryManager');
jest.mock('../../../../utils/SafeSocketEmitter');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }
}));

// Trick para mockear TikTokEventTransformer sin dar error de module not found si fuese el caso local
jest.mock('../../transformers/TikTokEventTransformer', () => ({
    TikTokEventTransformer: jest.fn().mockImplementation(() => ({}))
}));

interface TestableTikTokChatProvider {
    stateManager: jest.Mocked<TikTokConnectionStateManager>;
    connectionManager: jest.Mocked<TikTokConnectionManager>;
    eventListener: jest.Mocked<TikTokEventListener>;
    discovery: jest.Mocked<TikTokDiscoveryManager>;
    getConnection(userId: string): Promise<unknown>;
    clearInternalState(userId: string): Promise<void>;
}

describe('TikTokChatProvider', () => {
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let provider: TikTokChatProvider;
    let mockIo: jest.Mocked<Server>;

    const userId = 'user_tk_1';

    beforeEach(() => {
        mockConnectionService = {
            getAccount: jest.fn()
        } as unknown as jest.Mocked<ConnectionService>;

        provider = new TikTokChatProvider(mockConnectionService);
        mockIo = {} as unknown as jest.Mocked<Server>;

        jest.clearAllMocks();
    });

    describe('connect', () => {
        it('debe ignorar si ya se encuentra conectándose activamente', async () => {
            const internalProvider = provider as unknown as TestableTikTokChatProvider;
            internalProvider.stateManager.isConnecting.mockReturnValue(true);

            await provider.connect(userId, mockIo);

            expect(logger.debug).toHaveBeenCalledWith({ userId }, 'TikTok: Connection already in progress, skipping');
            expect(internalProvider.stateManager.setConnecting).not.toHaveBeenCalled();
            expect(internalProvider.discovery.setupAutoDiscovery).not.toHaveBeenCalled();
        });

        it('debe emitir el estatus actual de conexion si reporta que ya esta activamente conectado', async () => {
            const internalProvider = provider as unknown as TestableTikTokChatProvider;
            internalProvider.stateManager.isConnecting.mockReturnValue(false);
            internalProvider.stateManager.hasActiveConnection.mockReturnValue(true);

            internalProvider.eventListener.isStreamConfirmed.mockReturnValue(true); // Is LIVE

            await provider.connect(userId, mockIo);

            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'tiktok', 'connected', undefined, true);
        });

        it('debe abortar la conexion despues del flag si no encuetra la integracion en base de datos', async () => {
            const internalProvider = provider as unknown as TestableTikTokChatProvider;
            internalProvider.stateManager.isConnecting.mockReturnValue(false);
            internalProvider.stateManager.hasActiveConnection.mockReturnValue(false);

            mockConnectionService.getAccount.mockResolvedValue(null);

            await provider.connect(userId, mockIo);

            expect(internalProvider.stateManager.setConnecting).toHaveBeenCalledWith(userId, true);
            expect(logger.warn).toHaveBeenCalledWith({ userId }, 'TikTok: No account connected in DB');
            expect(internalProvider.stateManager.setConnecting).toHaveBeenCalledWith(userId, false);
            expect(internalProvider.discovery.setupAutoDiscovery).not.toHaveBeenCalled();
        });

        it('debe limpiar conexiones previas, emitir busqueda y arrancar discovery si la cuenta esta correcta', async () => {
            const internalProvider = provider as unknown as TestableTikTokChatProvider;
            internalProvider.stateManager.isConnecting.mockReturnValue(false);
            internalProvider.stateManager.hasActiveConnection.mockReturnValue(false);

            mockConnectionService.getAccount.mockResolvedValue({ providerUsername: '@username123' } as unknown as NonNullable<Awaited<ReturnType<typeof mockConnectionService.getAccount>>>);

            const activeConn = { removeAllListeners: jest.fn() };
            internalProvider.stateManager.getActiveConnection.mockReturnValue(activeConn as unknown as TikTokLiveConnection);

            await provider.connect(userId, mockIo);

            expect(internalProvider.stateManager.setConnecting).toHaveBeenCalledWith(userId, true);
            // Se limpian state previots de acuerdo a cleanInternalState:
            expect(activeConn.removeAllListeners).toHaveBeenCalled();
            expect(internalProvider.connectionManager.disconnect).toHaveBeenCalledWith(activeConn);
            expect(internalProvider.stateManager.clearState).toHaveBeenCalledWith(userId);

            // Se lanza el discovery
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'tiktok', 'connecting', 'Buscando...');
            expect(internalProvider.discovery.setupAutoDiscovery).toHaveBeenCalledWith(
                userId,
                'username123', // Regex lo deja normalizado
                mockIo,
                expect.any(Function)
            );
        });

        it('debe capurarr errores fallidos de discoverys y marcar fail localmente', async () => {
            const internalProvider = provider as unknown as TestableTikTokChatProvider;
            internalProvider.stateManager.isConnecting.mockReturnValue(false);
            internalProvider.stateManager.hasActiveConnection.mockReturnValue(false);

            const testError = new Error('Connection Fail');

            mockConnectionService.getAccount.mockRejectedValue(testError);

            await provider.connect(userId, mockIo);

            expect(logger.error).toHaveBeenCalledWith(expect.any(Object), 'TikTok: Failed to setup connection flow');
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'tiktok', 'error', 'Error al iniciar conexión');
            expect(internalProvider.stateManager.setConnecting).toHaveBeenCalledWith(userId, false);
        });
    });

    describe('boostDiscovery', () => {
        it('debe ignorar peticion si esta ocupado state.isConnecting', async () => {
            const internalProvider = provider as unknown as TestableTikTokChatProvider;
            internalProvider.stateManager.isConnecting.mockReturnValue(true);

            await provider.boostDiscovery(userId, mockIo);
            expect(logger.debug).toHaveBeenCalledWith({ userId }, 'TikTok: Boost requested but already connecting/discovering');
        });

        it('debe no emitir de vuelta si a la final no tenia credenciales tiktok validas', async () => {
            const internalProvider = provider as unknown as TestableTikTokChatProvider;
            internalProvider.stateManager.isConnecting.mockReturnValue(false);
            mockConnectionService.getAccount.mockResolvedValue({ providerUsername: null } as unknown as NonNullable<Awaited<ReturnType<typeof mockConnectionService.getAccount>>>);

            await provider.boostDiscovery(userId, mockIo);

            expect(logger.info).toHaveBeenCalledWith({ userId }, 'TikTok: Manual boost requested');
            expect(internalProvider.stateManager.setConnecting).not.toHaveBeenCalled();
        });

        it('debe marcar a manual mode y arrancar boost discovery directo del manager', async () => {
            const internalProvider = provider as unknown as TestableTikTokChatProvider;
            internalProvider.stateManager.isConnecting.mockReturnValue(false);
            mockConnectionService.getAccount.mockResolvedValue({ providerUsername: '@juan2' } as unknown as NonNullable<Awaited<ReturnType<typeof mockConnectionService.getAccount>>>);

            await provider.boostDiscovery(userId, mockIo);

            expect(internalProvider.stateManager.setManualMode).toHaveBeenCalledWith(userId, true);
            expect(internalProvider.stateManager.setConnecting).toHaveBeenCalledWith(userId, true);
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'tiktok', 'connecting', 'Buscando...');

            expect(internalProvider.discovery.boostDiscovery).toHaveBeenCalledWith(
                userId,
                'juan2',
                mockIo,
                expect.any(Function)
            );
        });
    });

    describe('disconnect and delete triggers', () => {
        it('debe borrar estado completo en disconnect', async () => {
            const internalProvider = provider as unknown as TestableTikTokChatProvider;
            internalProvider.stateManager.getActiveConnection.mockReturnValue(undefined);

            await provider.disconnect(userId);

            expect(logger.info).toHaveBeenCalledWith({ userId }, 'TikTok: Force disconnect requested');
            expect(internalProvider.stateManager.clearState).toHaveBeenCalledWith(userId);
            expect(internalProvider.eventListener.clearStreamConfirmation).toHaveBeenCalledWith(userId);
        });

        it('debe borrar estado completo en delete as accountDelete', async () => {
            const internalProvider = provider as unknown as TestableTikTokChatProvider;
            const activeConn = { removeAllListeners: jest.fn() };
            internalProvider.stateManager.getActiveConnection.mockReturnValue(activeConn as unknown as TikTokLiveConnection);

            await provider.onAccountDeleted(userId);

            expect(logger.info).toHaveBeenCalledWith({ userId }, 'TikTok: Permanent account deletion cleanup');
            expect(activeConn.removeAllListeners).toHaveBeenCalled();
            expect(internalProvider.connectionManager.disconnect).toHaveBeenCalledWith(activeConn);
            expect(internalProvider.stateManager.clearState).toHaveBeenCalledWith(userId);
        });

        it('debe captrar fallos del disconex silenciosamente as clear interal stage', async () => {
            const internalProvider = provider as unknown as TestableTikTokChatProvider;
            const activeConn = { removeAllListeners: jest.fn() };
            internalProvider.stateManager.getActiveConnection.mockReturnValue(activeConn as unknown as TikTokLiveConnection);
            internalProvider.connectionManager.disconnect.mockImplementation(() => { throw new Error('Unclean error'); });

            await provider.onAccountDeleted(userId);

            expect(logger.error).toHaveBeenCalledWith(expect.any(Object), 'TikTok: Error during client disconnection');
            expect(internalProvider.stateManager.clearState).toHaveBeenCalledWith(userId);
        });
    });
});
