import { ConnectionRepository } from '../ConnectionRepository';
import { Connection } from '../../../models/Connection.model';
import { AuthTokens } from '../../../types/index';
import { encryptionService } from '../../../services/security/EncryptionService';
import { calculateTokenExpiry } from '../../../utils/tokenUtils';

jest.mock('../../../models/Connection.model');
jest.mock('../../../services/security/EncryptionService');
jest.mock('../../../utils/tokenUtils');
jest.mock('../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

describe('ConnectionRepository', () => {
    let repository: ConnectionRepository;

    const mockTokens: AuthTokens = {
        access_token: 'plain-access-token',
        refresh_token: 'plain-refresh-token',
        expires_in: 3600,
        token_type: 'Bearer'
    };

    const mockConnection = {
        id: 'conn-123',
        userId: 'user-123',
        provider: 'twitch',
        providerId: 'provider-123',
        providerUsername: 'testuser',
        accessToken: 'encrypted-access',
        refreshToken: 'encrypted-refresh',
        expiryDate: new Date('2025-12-31'),
        chatroomId: null,
        save: jest.fn().mockResolvedValue(undefined)
    };

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new ConnectionRepository();

        (encryptionService.encrypt as jest.Mock).mockImplementation((val: string) => `encrypted-${val}`);
        (encryptionService.decrypt as jest.Mock).mockImplementation((val: string) => val.replace('encrypted-', ''));
        (encryptionService.isEncrypted as jest.Mock).mockReturnValue(true);
        (calculateTokenExpiry as jest.Mock).mockReturnValue(new Date('2025-12-31'));
    });

    afterEach(() => {
        ConnectionRepository.stopCleanup();
    });

    describe('findByProvider', () => {
        it('debe encontrar conexión por proveedor y providerId', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);

            const result = await repository.findByProvider('twitch', 'provider-123');

            expect(Connection.findOne).toHaveBeenCalledWith({
                where: { provider: 'twitch', providerId: 'provider-123' },
                include: ['user'],
                transaction: undefined
            });
            expect(result).toBeDefined();
        });

        it('debe retornar null cuando no existe la conexión', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue(null);

            const result = await repository.findByProvider('youtube', 'nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('findByUserAndProvider', () => {
        it('debe encontrar conexión por userId y provider', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);

            const result = await repository.findByUserAndProvider('user-123', 'twitch');

            expect(Connection.findOne).toHaveBeenCalledWith({
                where: { userId: 'user-123', provider: 'twitch' },
                transaction: undefined
            });
            expect(result).toBeDefined();
        });

        it('debe retornar null cuando no existe', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue(null);

            const result = await repository.findByUserAndProvider('user-123', 'kick');

            expect(result).toBeNull();
        });
    });

    describe('findAllByUserId', () => {
        it('debe retornar todas las conexiones del usuario', async () => {
            const connections = [mockConnection, { ...mockConnection, provider: 'youtube' }];
            (Connection.findAll as jest.Mock).mockResolvedValue(connections);

            const result = await repository.findAllByUserId('user-123');

            expect(Connection.findAll).toHaveBeenCalledWith({
                where: { userId: 'user-123' },
                transaction: undefined
            });
            expect(result).toHaveLength(2);
        });

        it('debe retornar array vacío cuando no hay conexiones', async () => {
            (Connection.findAll as jest.Mock).mockResolvedValue([]);

            const result = await repository.findAllByUserId('user-without-connections');

            expect(result).toEqual([]);
        });
    });

    describe('createOrUpdate', () => {
        it('debe crear nueva conexión cuando no existe', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue(null);
            (Connection.create as jest.Mock).mockResolvedValue(mockConnection);

            const result = await repository.createOrUpdate(
                'user-123',
                'twitch',
                'provider-123',
                'testuser',
                mockTokens
            );

            expect(Connection.create).toHaveBeenCalled();
            expect(encryptionService.encrypt).toHaveBeenCalledWith('plain-access-token');
            expect(result.accessToken).toBe('plain-access-token');
        });

        it('debe actualizar conexión existente', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);

            const result = await repository.createOrUpdate(
                'user-123',
                'twitch',
                'provider-123',
                'testuser',
                mockTokens
            );

            expect(mockConnection.save).toHaveBeenCalled();
            expect(result.accessToken).toBe('plain-access-token');
        });

        it('debe actualizar chatroomId cuando se proporciona', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);

            await repository.createOrUpdate(
                'user-123',
                'twitch',
                'provider-123',
                'testuser',
                mockTokens,
                undefined,
                'chatroom-456'
            );

            expect(mockConnection.chatroomId).toBe('chatroom-456');
        });
    });

    describe('removeByUserAndProvider', () => {
        it('debe eliminar conexión correctamente', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            (Connection.destroy as jest.Mock).mockResolvedValue(1);

            const result = await repository.removeByUserAndProvider('user-123', 'twitch');

            expect(Connection.destroy).toHaveBeenCalledWith({
                where: { userId: 'user-123', provider: 'twitch' },
                transaction: undefined
            });
            expect(result).toBe(1);
        });

        it('debe retornar 0 cuando no hay conexión para eliminar', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue(null);
            (Connection.destroy as jest.Mock).mockResolvedValue(0);

            const result = await repository.removeByUserAndProvider('user-123', 'youtube');

            expect(result).toBe(0);
        });
    });

    describe('updateTokens', () => {
        it('debe actualizar tokens correctamente', async () => {
            (Connection.findByPk as jest.Mock).mockResolvedValue(mockConnection);

            const result = await repository.updateTokens('conn-123', mockTokens);

            expect(Connection.findByPk).toHaveBeenCalledWith('conn-123', { transaction: undefined });
            expect(mockConnection.save).toHaveBeenCalled();
            expect(result?.accessToken).toBe('plain-access-token');
        });

        it('debe retornar null cuando la conexión no existe', async () => {
            (Connection.findByPk as jest.Mock).mockResolvedValue(null);

            const result = await repository.updateTokens('nonexistent', mockTokens);

            expect(result).toBeNull();
        });
    });

    describe('clearTokens', () => {
        it('debe limpiar tokens correctamente', async () => {
            (Connection.findByPk as jest.Mock).mockResolvedValue(mockConnection);

            await repository.clearTokens('conn-123');

            expect(mockConnection.accessToken).toBe('');
            expect(mockConnection.refreshToken).toBe('');
            expect(mockConnection.expiryDate).toBeNull();
            expect(mockConnection.save).toHaveBeenCalled();
        });

        it('no debe fallar cuando la conexión no existe', async () => {
            (Connection.findByPk as jest.Mock).mockResolvedValue(null);

            await expect(repository.clearTokens('nonexistent')).resolves.not.toThrow();
        });
    });

    describe('updateChatroomId', () => {
        it('debe actualizar chatroomId correctamente', async () => {
            (Connection.update as jest.Mock).mockResolvedValue([1]);

            await repository.updateChatroomId('user-123', 'youtube', 'new-chatroom-id');

            expect(Connection.update).toHaveBeenCalledWith(
                { chatroomId: 'new-chatroom-id' },
                { where: { userId: 'user-123', provider: 'youtube' } }
            );
        });
    });
});
