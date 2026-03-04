import tmi from 'tmi.js';
import { TwitchConnectionManager } from '../TwitchConnectionManager';
import { Connection } from '../../../../models/Connection.model';
import { ConnectionService } from '../../../connection/ConnectionService';
import { logger } from '../../../../utils/logger';

jest.mock('tmi.js');
jest.mock('../../../../models/Connection.model');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    }
}));

describe('TwitchConnectionManager', () => {
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let manager: TwitchConnectionManager;
    let mockTmiClient: Record<string, jest.Mock>;

    beforeEach(() => {
        mockConnectionService = {
            getValidAccessToken: jest.fn()
        } as unknown as jest.Mocked<ConnectionService>;

        manager = new TwitchConnectionManager(mockConnectionService);

        mockTmiClient = {
            connect: jest.fn().mockResolvedValue(undefined),
            disconnect: jest.fn().mockResolvedValue(undefined),
            removeAllListeners: jest.fn()
        };

        (tmi.Client as unknown as jest.Mock).mockReturnValue(mockTmiClient);
        jest.clearAllMocks();
    });

    describe('connect', () => {
        const userId = 'user123';

        it('debe lanzar error si no se encuentra conexión', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue(null);

            await expect(manager.connect(userId)).rejects.toThrow('No Twitch connection found');
            expect(Connection.findOne).toHaveBeenCalledWith(
                expect.objectContaining({ where: { userId, provider: 'twitch' } })
            );
        });

        it('debe conectar al cliente TMI usando username del provider y token cacheado si es válido', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue({
                providerUsername: 'twitch_user',
                user: { username: 'app_user' },
                accessToken: 'old_token'
            });
            mockConnectionService.getValidAccessToken.mockResolvedValue('valid_token_123');

            const client = await manager.connect(userId);

            expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledWith(userId, 'twitch');
            expect(tmi.Client).toHaveBeenCalledWith(expect.objectContaining({
                identity: { username: 'twitch_user', password: 'oauth:valid_token_123' },
                channels: ['twitch_user']
            }));
            expect((client as unknown as { connect: jest.Mock }).connect).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith(expect.any(Object), 'Connected to Twitch chat');
            expect(client).toBe(mockTmiClient);
        });

        it('debe conectar al cliente TMI usando username del user y token viejo si el cache falla', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue({
                providerUsername: null,
                user: { username: 'app_user' },
                accessToken: 'old_token'
            });
            mockConnectionService.getValidAccessToken.mockResolvedValue(null);

            await manager.connect(userId);

            expect(tmi.Client).toHaveBeenCalledWith(expect.objectContaining({
                identity: { username: 'app_user', password: 'oauth:old_token' },
                channels: ['app_user']
            }));
            expect(logger.info).toHaveBeenCalled();
        });
    });

    describe('disconnect', () => {
        it('debe desconectar el cliente satisfactoriamente', async () => {
            const client = mockTmiClient as unknown as tmi.Client;
            await manager.disconnect(client);

            expect(client.disconnect).toHaveBeenCalled();
            expect(client.removeAllListeners).toHaveBeenCalled();
            expect(logger.debug).toHaveBeenCalledWith({}, 'Twitch client disconnected successfully');
        });

        it('debe capturar y registrar el error si la desconexión falla', async () => {
            const client = mockTmiClient as unknown as tmi.Client;
            const error = new Error('Disconnect fail');
            (client.disconnect as jest.Mock).mockRejectedValue(error);

            await manager.disconnect(client);

            expect(logger.error).toHaveBeenCalledWith({ err: error }, 'Error disconnecting Twitch client');
        });
    });
});
