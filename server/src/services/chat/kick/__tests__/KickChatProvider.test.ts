import { Server } from 'socket.io';
import { KickChatProvider } from '../KickChatProvider';
import { KickManager } from '../KickManager';
import { ConnectionService } from '../../../connection/ConnectionService';
import { SafeSocketEmitter } from '../../../../utils/SafeSocketEmitter';
import { logger } from '../../../../utils/logger';

jest.mock('../KickManager');
jest.mock('../../../connection/ConnectionService');
jest.mock('../../../../utils/SafeSocketEmitter');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    }
}));

interface TestableKickChatProvider {
    manager: KickManager;
    connectingUsers: Set<string>;
}

describe('KickChatProvider', () => {
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let provider: KickChatProvider;
    let mockIo: jest.Mocked<Server>;

    const userId = 'u_123';

    beforeEach(() => {
        mockConnectionService = {
            getAccount: jest.fn(),
            getValidAccessToken: jest.fn(),
        } as unknown as jest.Mocked<ConnectionService>;

        provider = new KickChatProvider(mockConnectionService);
        mockIo = {} as unknown as jest.Mocked<Server>;

        jest.clearAllMocks();
    });

    describe('connect', () => {
        it('debe ignorar llamados si ya está conectando', async () => {
            const _connectPromise = provider.connect(userId, mockIo);
            await provider.connect(userId, mockIo);

            expect(logger.debug).toHaveBeenCalledWith({ userId }, 'Already connecting to Kick, skipping...');
            await _connectPromise; // limpamos el set
        });

        it('debe ignorar llamados y retornar status connected si ya está polleando activamente', async () => {
            const internalManager = (provider as unknown as TestableKickChatProvider).manager as jest.Mocked<KickManager>;
            internalManager.isPolling.mockReturnValue(true);
            internalManager.isLive.mockReturnValue(true);

            await provider.connect(userId, mockIo);

            expect(logger.debug).toHaveBeenCalledWith({ userId }, 'Kick already connected and polling, returning early');
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'kick', 'connected', 'Conectado', true);
        });

        it('debe devolver error y abortar si no encuentra conexion de kick del usuario', async () => {
            const internalManager = (provider as unknown as TestableKickChatProvider).manager as jest.Mocked<KickManager>;
            internalManager.isPolling.mockReturnValue(false);
            mockConnectionService.getAccount.mockResolvedValue(null);

            await provider.connect(userId, mockIo);

            expect(logger.debug).toHaveBeenCalledWith({ userId }, 'No Kick connection found');
            expect((provider as unknown as TestableKickChatProvider).connectingUsers.has(userId)).toBe(false);
        });

        it('debe emitir error si no puede obtener token de acceso valido', async () => {
            const internalManager = (provider as unknown as TestableKickChatProvider).manager as jest.Mocked<KickManager>;
            internalManager.isPolling.mockReturnValue(false);
            const dummyConnection = { provider: 'kick', accessToken: 'expired' };
            mockConnectionService.getAccount.mockResolvedValue(dummyConnection as unknown as NonNullable<Awaited<ReturnType<typeof mockConnectionService.getAccount>>>);
            mockConnectionService.getValidAccessToken.mockResolvedValue(null);

            await provider.connect(userId, mockIo);

            expect(logger.error).toHaveBeenCalledWith({ userId }, 'No Kick access token');
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'kick', 'error', 'Error sesión');
        });

        it('debe emitir error si getChannelInfo falla al no encontrar canal del streamer de kick', async () => {
            const internalManager = (provider as unknown as TestableKickChatProvider).manager as jest.Mocked<KickManager>;
            internalManager.isPolling.mockReturnValue(false);
            mockConnectionService.getAccount.mockResolvedValue({} as unknown as NonNullable<Awaited<ReturnType<typeof mockConnectionService.getAccount>>>);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_tok');
            internalManager.getChannelInfo.mockResolvedValue(null); // simula que no encontro info del canal

            await provider.connect(userId, mockIo);

            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'kick', 'connecting', 'Buscando...');
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'kick', 'error', 'No encontrado');
            expect(internalManager.getChannelInfo).toHaveBeenCalledWith('valid_tok', userId, mockIo);
        });

        it('debe realizar la preparacion completa, webhook e inicio de poller si la cuenta es obtenida exitosamente', async () => {
            const internalManager = (provider as unknown as TestableKickChatProvider).manager as jest.Mocked<KickManager>;
            internalManager.isPolling.mockReturnValue(false);
            mockConnectionService.getAccount.mockResolvedValue({} as unknown as NonNullable<Awaited<ReturnType<typeof mockConnectionService.getAccount>>>);
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_tok');

            internalManager.getChannelInfo.mockResolvedValue({
                broadcasterId: 'b_1',
                slug: 'channel_1',
                viewerCount: 15,
                isLive: true
            });

            await provider.connect(userId, mockIo);

            // Detiene pollers viejos preventivamente
            expect(internalManager.stopViewerPolling).toHaveBeenCalledWith(userId);

            // Inicia el nuevo poller
            expect(internalManager.startViewerPolling).toHaveBeenCalledWith(userId, 'valid_tok', mockIo);
            expect(logger.info).toHaveBeenCalledWith(
                expect.objectContaining({ slug: 'channel_1' }),
                'Connected to Kick chat'
            );

            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'kick', 'connected', 'Conectado', true);

            // Por ultimo el webhook manager se invoca
            expect(internalManager.registerWebhook).toHaveBeenCalledWith(userId, 'valid_tok', 'b_1');
        });

        it('debe capturar errores inesperados en el proceso de connect y garantizar finally', async () => {
            const internalManager = (provider as unknown as TestableKickChatProvider).manager as jest.Mocked<KickManager>;
            internalManager.isPolling.mockReturnValue(false);
            mockConnectionService.getAccount.mockRejectedValue(new Error('Fatal ConnectionError'));

            await provider.connect(userId, mockIo);

            expect(logger.error).toHaveBeenCalledWith(expect.any(Object), 'Error connecting to Kick');
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'kick', 'error', 'Error');
            expect((provider as unknown as TestableKickChatProvider).connectingUsers.has(userId)).toBe(false);
        });
    });

    describe('disconnect', () => {
        it('debe detener unicamente el poller dejando vivo el webhook y la conexion oauth', async () => {
            const internalManager = (provider as unknown as TestableKickChatProvider).manager as jest.Mocked<KickManager>;
            await provider.disconnect(userId);

            expect(logger.info).toHaveBeenCalledWith({ userId }, 'KickChatProvider: Deteniendo polling de espectadores');
            expect(internalManager.stopViewerPolling).toHaveBeenCalledWith(userId);
            expect(logger.info).toHaveBeenCalledWith({ userId }, 'KickChatProvider: Disconnect completed (webhook remains active)');
        });
    });

    describe('onAccountDeleted', () => {
        const internalManager = () => (provider as unknown as TestableKickChatProvider).manager as jest.Mocked<KickManager>;

        it('debe invocar a la desactivacion permanente del webhook mediante deactivateWebhook', async () => {
            mockConnectionService.getAccount.mockResolvedValue({ providerId: 'b_5' } as unknown as NonNullable<Awaited<ReturnType<typeof mockConnectionService.getAccount>>>);

            await provider.onAccountDeleted(userId);

            expect(logger.info).toHaveBeenCalledWith({ userId }, 'KickChatProvider: Permanent account deletion cleanup');
            expect(internalManager().deactivateWebhook).toHaveBeenCalledWith('b_5');
        });

        it('debe saltarlo si no tiene ni siquiera cuenta unida del provider kick', async () => {
            mockConnectionService.getAccount.mockResolvedValue(null);

            await provider.onAccountDeleted(userId);

            expect(internalManager().deactivateWebhook).not.toHaveBeenCalled();
        });

        it('debe soportar y registrar fatal data bugs (DB Errors) durante borrado', async () => {
            mockConnectionService.getAccount.mockRejectedValue(new Error('DB Query crash'));

            await provider.onAccountDeleted(userId);

            expect(logger.error).toHaveBeenCalledWith(expect.any(Object), 'KickChatProvider: Error during permanent deletion cleanup');
        });
    });

    describe('getStatus', () => {
        const internalManager = () => (provider as unknown as TestableKickChatProvider).manager as jest.Mocked<KickManager>;

        it('debe devolver status connecting si el usuario esta en proceso de conexion', () => {
            (provider as unknown as TestableKickChatProvider).connectingUsers.add(userId);

            const status = provider.getStatus(userId);

            expect(status).toEqual({
                status: 'connecting',
                message: 'Buscando...',
                isLive: false
            });
        });

        it('debe devolver status connected con isLive real si esta polleando', () => {
            internalManager().isPolling.mockReturnValue(true);
            internalManager().isLive.mockReturnValue(true);

            const status = provider.getStatus(userId);

            expect(status).toEqual({
                status: 'connected',
                message: 'Conectado',
                isLive: true
            });
        });

        it('debe devolver null si no hay actividad para ese usuario', () => {
            internalManager().isPolling.mockReturnValue(false);

            const status = provider.getStatus(userId);

            expect(status).toBeNull();
        });
    });

});
