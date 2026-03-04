import { Server } from 'socket.io';
import { TwitchChatProvider } from '../TwitchChatProvider';
import { TwitchManager } from '../TwitchManager';
import { SafeSocketEmitter } from '../../../../utils/SafeSocketEmitter';
import { Connection } from '../../../../models/Connection.model';
import { ConnectionService } from '../../../connection/ConnectionService';
import { logger } from '../../../../utils/logger';
import tmi from 'tmi.js';

jest.mock('../TwitchConnectionManager');
jest.mock('../TwitchEventListener');
jest.mock('../../../../utils/SafeSocketEmitter');
jest.mock('../../../../models/Connection.model');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    }
}));

import { TwitchConnectionManager } from '../TwitchConnectionManager';
import { TwitchEventListener } from '../TwitchEventListener';

interface TestableTwitchChatProvider {
    activeClients: Map<string, tmi.Client>;
    connectingUsers: Set<string>;
    connectionManager: TwitchConnectionManager;
    eventListener: TwitchEventListener;
}

describe('TwitchChatProvider', () => {
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockTwitchManager: jest.Mocked<TwitchManager>;
    let provider: TwitchChatProvider;
    let mockIo: jest.Mocked<Server>;

    const userId = 'user123';

    beforeEach(() => {
        mockConnectionService = {} as unknown as jest.Mocked<ConnectionService>;
        mockTwitchManager = {
            registerWebhooks: jest.fn().mockResolvedValue(undefined),
            deleteAllSubscriptions: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<TwitchManager>;

        mockIo = {} as unknown as jest.Mocked<Server>;

        provider = new TwitchChatProvider(mockConnectionService, mockTwitchManager);

        jest.clearAllMocks();
    });

    describe('connect', () => {
        it('debe ignorar si ya se está conectando', async () => {
            // Simulamos conectar sin await para que state sea 'connectingUsers.has(userId)'
            const connectPromise = provider.connect(userId, mockIo);

            // Segunda llamada síncrona mientras está la primera
            await provider.connect(userId, mockIo);

            expect(logger.debug).toHaveBeenCalledWith(
                { userId },
                'Already connecting to Twitch, skipping...'
            );
            await connectPromise; // Terminamos la primera para limpiar
        });

        it('debe emitir conectado si el cliente ya está activo sin consultar DB', async () => {
            // Forzamos un cliente activo vía reflection
            (provider as unknown as TestableTwitchChatProvider).activeClients.set(userId, {} as unknown as tmi.Client);

            await provider.connect(userId, mockIo);

            expect(logger.debug).toHaveBeenCalledWith({ userId }, 'User already has an active Twitch client, skipping unnecessary DB lookup');
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'twitch', 'connected', 'Conectado');
        });

        it('debe conectar exitosamente, configurar listeners y registrar webhooks', async () => {
            const mockClient = { connect: jest.fn() } as unknown as tmi.Client;

            const connectionManagerInstance = (provider as unknown as TestableTwitchChatProvider).connectionManager;
            connectionManagerInstance.connect = jest.fn().mockResolvedValue(mockClient);

            const eventListenerInstance = (provider as unknown as TestableTwitchChatProvider).eventListener;
            eventListenerInstance.setupListeners = jest.fn();

            (Connection.findOne as jest.Mock).mockResolvedValue({ providerId: 'tw_channel_123' });

            await provider.connect(userId, mockIo);

            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'twitch', 'connecting', 'Buscando...');
            expect(logger.info).toHaveBeenCalledWith({ userId }, 'Connecting to Twitch chat');
            expect(connectionManagerInstance.connect).toHaveBeenCalledWith(userId);

            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'twitch', 'connected', 'Conectado');
            expect(eventListenerInstance.setupListeners).toHaveBeenCalledWith(userId, mockClient, mockIo);

            expect(mockTwitchManager.registerWebhooks).toHaveBeenCalledWith(userId, 'tw_channel_123');
        });

        it('debe desconectar y abortar si la conexión ya no es necesaria tras el await', async () => {
            // connectionManagerInstance.connect mock
            const mockClient = { connect: jest.fn() } as unknown as tmi.Client;
            const connectionManagerInstance = (provider as unknown as TestableTwitchChatProvider).connectionManager;
            connectionManagerInstance.connect = jest.fn().mockImplementation(async () => {
                // Simulamos una desconección/remoción ocurriendo en medio de la async wait
                (provider as unknown as TestableTwitchChatProvider).connectingUsers.delete(userId);
                return mockClient;
            });
            connectionManagerInstance.disconnect = jest.fn().mockResolvedValue(undefined);

            await provider.connect(userId, mockIo);

            expect(logger.info).toHaveBeenCalledWith(
                { userId },
                'Twitch: Connection established but no longer needed, disconnecting...'
            );
            expect(connectionManagerInstance.disconnect).toHaveBeenCalledWith(mockClient);
        });

        it('debe manejar errores de conexión y emitirlos por socket', async () => {
            const connectionManagerInstance = (provider as unknown as TestableTwitchChatProvider).connectionManager;
            connectionManagerInstance.connect = jest.fn().mockRejectedValue(new Error('Connect failed'));

            await provider.connect(userId, mockIo);

            expect(logger.error).toHaveBeenCalledWith(
                expect.any(Object),
                'Error connecting to Twitch'
            );
            expect(SafeSocketEmitter.emitConnectionStatus).toHaveBeenCalledWith(mockIo, userId, 'twitch', 'error', 'Error sesión');
        });
    });

    describe('disconnect', () => {
        it('debe desconectar y limpiar listeners activos', async () => {
            const mockClient = {} as unknown as tmi.Client;
            (provider as unknown as TestableTwitchChatProvider).activeClients.set(userId, mockClient);
            (provider as unknown as TestableTwitchChatProvider).connectingUsers.add(userId);

            const eventListenerInstance = (provider as unknown as TestableTwitchChatProvider).eventListener;
            eventListenerInstance.removeListeners = jest.fn();
            const connectionManagerInstance = (provider as unknown as TestableTwitchChatProvider).connectionManager;
            connectionManagerInstance.disconnect = jest.fn().mockResolvedValue(undefined);

            await provider.disconnect(userId);

            expect(eventListenerInstance.removeListeners).toHaveBeenCalledWith(userId, mockClient);
            expect(connectionManagerInstance.disconnect).toHaveBeenCalledWith(mockClient);
            expect((provider as unknown as TestableTwitchChatProvider).activeClients.has(userId)).toBe(false);
            expect((provider as unknown as TestableTwitchChatProvider).connectingUsers.has(userId)).toBe(false);
            expect(logger.info).toHaveBeenCalledWith({ userId }, 'TwitchChatProvider: Disconnect completed');
        });

        it('debe manejar errores y realizar el finally', async () => {
            const mockClient = {} as unknown as tmi.Client;
            (provider as unknown as TestableTwitchChatProvider).activeClients.set(userId, mockClient);
            const connectionManagerInstance = (provider as unknown as TestableTwitchChatProvider).connectionManager;
            connectionManagerInstance.disconnect = jest.fn().mockRejectedValue(new Error('Failed disconnect'));

            await provider.disconnect(userId);

            expect(logger.error).toHaveBeenCalledWith(expect.any(Object), 'TwitchChatProvider: Error during client disconnection');
            expect((provider as unknown as TestableTwitchChatProvider).activeClients.has(userId)).toBe(false);
        });
    });

    describe('onAccountDeleted', () => {
        it('debe borrar todas las suscripciones llamando al TwitchManager si tiene conexión activa', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue({ providerId: 'tw_prov_1' });

            await provider.onAccountDeleted(userId);

            expect(logger.info).toHaveBeenCalledWith({ userId }, 'TwitchChatProvider: Permanent account deletion cleanup');
            expect(mockTwitchManager.deleteAllSubscriptions).toHaveBeenCalledWith('tw_prov_1');
        });

        it('no debe hacer nada si no existe su conexión en base de datos', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue(null);

            await provider.onAccountDeleted(userId);

            expect(mockTwitchManager.deleteAllSubscriptions).not.toHaveBeenCalled();
        });

        it('debe capturar fallos', async () => {
            (Connection.findOne as jest.Mock).mockRejectedValue(new Error('BD failed'));

            await provider.onAccountDeleted(userId);

            expect(logger.error).toHaveBeenCalledWith(expect.any(Object), 'TwitchChatProvider: Error during permanent deletion cleanup');
        });
    });
});
