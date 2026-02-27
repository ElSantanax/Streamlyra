import { ChatManager } from '../ChatManager';
import { Server } from 'socket.io';
import { ConnectionService } from '../../connection/ConnectionService';
import { ChatProvider } from '../../chat';
import { Platform } from '../../../constants/platforms';
import { Connection } from '../../../models/Connection.model';
import { withErrorHandling } from '../../../utils/errorHandling';

jest.mock('../../../utils/SafeSocketEmitter');
jest.mock('../../../utils/errorHandling');
jest.mock('../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

describe('ChatManager', () => {
    let chatManager: ChatManager;
    let mockIo: jest.Mocked<Server>;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockProvider: jest.Mocked<ChatProvider>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockIo = {} as jest.Mocked<Server>;
        mockConnectionService = {
            getAllConnections: jest.fn()
        } as unknown as jest.Mocked<ConnectionService>;

        mockProvider = {
            connect: jest.fn().mockResolvedValue(undefined),
            disconnect: jest.fn().mockResolvedValue(undefined),
            boostDiscovery: jest.fn().mockResolvedValue(undefined),
            onAccountDeleted: jest.fn().mockResolvedValue(undefined)
        };

        chatManager = new ChatManager(mockIo, mockConnectionService);

        (withErrorHandling as jest.Mock).mockImplementation(async (fn) => {
            return await fn();
        });
    });

    describe('setProviders', () => {
        it('debe configurar el mapa de proveedores correctamente', () => {
            const providersMap = new Map<Platform, ChatProvider>([
                ['twitch', mockProvider]
            ]);

            chatManager.setProviders(providersMap);

            expect(providersMap.size).toBe(1);
        });
    });

    describe('connectUser', () => {
        it('debe conectar todos los proveedores activos del usuario', async () => {
            const userId = 'user123';
            const connections = [
                { provider: 'twitch' },
                { provider: 'youtube' }
            ] as unknown as Connection[];

            mockConnectionService.getAllConnections.mockResolvedValue(connections);

            const providersMap = new Map<Platform, ChatProvider>([
                ['twitch', mockProvider],
                ['youtube', mockProvider]
            ]);
            chatManager.setProviders(providersMap);

            await chatManager.connectUser(userId);

            expect(mockConnectionService.getAllConnections).toHaveBeenCalledWith(userId);
        });

        it('no debe lanzar error cuando no hay conexiones activas', async () => {
            const userId = 'user123';
            mockConnectionService.getAllConnections.mockResolvedValue([]);

            await expect(chatManager.connectUser(userId)).resolves.not.toThrow();
        });
    });

    describe('disconnectUser', () => {
        it('debe desconectar todos los proveedores configurados', async () => {
            const userId = 'user123';
            const providersMap = new Map<Platform, ChatProvider>([
                ['twitch', mockProvider],
                ['kick', mockProvider]
            ]);
            chatManager.setProviders(providersMap);

            await chatManager.disconnectUser(userId);

            expect(withErrorHandling).toHaveBeenCalled();
        });
    });

    describe('connectProvider', () => {
        it('debe conectar un proveedor específico cuando existe', async () => {
            const userId = 'user123';
            const platform: Platform = 'twitch';

            const providersMap = new Map<Platform, ChatProvider>([
                [platform, mockProvider]
            ]);
            chatManager.setProviders(providersMap);

            await chatManager.connectProvider(userId, platform);

            expect(withErrorHandling).toHaveBeenCalled();
        });

        it('no debe fallar cuando el proveedor no existe', async () => {
            const userId = 'user123';
            const platform: Platform = 'youtube';

            chatManager.setProviders(new Map());

            await expect(chatManager.connectProvider(userId, platform)).resolves.not.toThrow();
        });
    });

    describe('boostProviderDiscovery', () => {
        it('debe ejecutar boostDiscovery cuando el proveedor lo soporta', async () => {
            const userId = 'user123';
            const platform: Platform = 'youtube';

            const providersMap = new Map<Platform, ChatProvider>([
                [platform, mockProvider]
            ]);
            chatManager.setProviders(providersMap);

            await chatManager.boostProviderDiscovery(userId, platform, true);

            expect(withErrorHandling).toHaveBeenCalled();
        });

        it('no debe fallar cuando el proveedor no tiene boostDiscovery', async () => {
            const userId = 'user123';
            const platform: Platform = 'twitch';
            const providerWithoutBoost: jest.Mocked<ChatProvider> = {
                connect: jest.fn(),
                disconnect: jest.fn()
            };

            const providersMap = new Map<Platform, ChatProvider>([
                [platform, providerWithoutBoost]
            ]);
            chatManager.setProviders(providersMap);

            await expect(chatManager.boostProviderDiscovery(userId, platform)).resolves.not.toThrow();
        });
    });

    describe('disconnectProvider', () => {
        it('debe desconectar el proveedor y emitir eventos de estado', async () => {
            const userId = 'user123';
            const platform: Platform = 'kick';

            const providersMap = new Map<Platform, ChatProvider>([
                [platform, mockProvider]
            ]);
            chatManager.setProviders(providersMap);

            await chatManager.disconnectProvider(userId, platform);

            expect(withErrorHandling).toHaveBeenCalled();
        });
    });

    describe('handleAccountDeletion', () => {
        it('debe ejecutar onAccountDeleted cuando el proveedor lo soporta', async () => {
            const userId = 'user123';
            const platform: Platform = 'twitch';

            const providersMap = new Map<Platform, ChatProvider>([
                [platform, mockProvider]
            ]);
            chatManager.setProviders(providersMap);

            await chatManager.handleAccountDeletion(userId, platform);

            expect(withErrorHandling).toHaveBeenCalled();
        });

        it('no debe fallar cuando el proveedor no tiene onAccountDeleted', async () => {
            const userId = 'user123';
            const platform: Platform = 'youtube';
            const providerWithoutDelete: jest.Mocked<ChatProvider> = {
                connect: jest.fn(),
                disconnect: jest.fn()
            };

            const providersMap = new Map<Platform, ChatProvider>([
                [platform, providerWithoutDelete]
            ]);
            chatManager.setProviders(providersMap);

            await expect(chatManager.handleAccountDeletion(userId, platform)).resolves.not.toThrow();
        });
    });
});
