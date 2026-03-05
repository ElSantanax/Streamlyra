import { UserService } from '../UserService';
import { IUserRepository } from '../../../repositories/interfaces/IUserRepository';
import { IConnectionRepository } from '../../../repositories/interfaces/IConnectionRepository';
import { User } from '../../../models/User.model';
import { Connection } from '../../../models/Connection.model';
import { encryptionService } from '../../security/EncryptionService';
import { logger } from '../../../utils/logger';
import { PlatformProfile } from '../../../types';

jest.mock('../../security/EncryptionService');
jest.mock('../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }
}));
jest.mock('../../../utils/tokenUtils', () => ({
    hashToken: jest.fn().mockImplementation((t) => `hashed_${t}`)
}));

describe('UserService', () => {
    let userService: UserService;
    let mockUserRepo: jest.Mocked<IUserRepository>;
    let mockConnRepo: jest.Mocked<IConnectionRepository>;

    beforeEach(() => {
        mockUserRepo = {
            findByIdWithConnections: jest.fn(),
            findByProvider: jest.fn(),
            findById: jest.fn(),
            findByEmail: jest.fn(),
            usernameExists: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            findByOverlayTokenHash: jest.fn()
        } as unknown as jest.Mocked<IUserRepository>;

        mockConnRepo = {
            findByProvider: jest.fn()
        } as unknown as jest.Mocked<IConnectionRepository>;

        userService = new UserService(mockUserRepo, mockConnRepo);
        jest.clearAllMocks();

        // Default implementation for encryptionService
        (encryptionService.isEncrypted as jest.Mock).mockReturnValue(true);
        (encryptionService.decrypt as jest.Mock).mockImplementation((t) => `decrypted_${t}`);
        (encryptionService.encrypt as jest.Mock).mockImplementation((t) => `encrypted_${t}`);
    });

    describe('getById', () => {
        it('debería obtener un usuario y desencriptar el overlayToken', async () => {
            const mockUser = { id: 'u1', overlayToken: 'enc_token' } as User;
            mockUserRepo.findByIdWithConnections.mockResolvedValue(mockUser);

            const result = await userService.getById('u1');

            expect(result?.overlayToken).toBe('decrypted_enc_token');
            expect(encryptionService.decrypt).toHaveBeenCalledWith('enc_token', 'User:u1 overlayToken');
        });

        it('debería manejar errores de desencriptación', async () => {
            const mockUser = { id: 'u1', overlayToken: 'bad_token' } as User;
            mockUserRepo.findByIdWithConnections.mockResolvedValue(mockUser);
            (encryptionService.decrypt as jest.Mock).mockImplementation(() => { throw new Error('fail'); });

            const result = await userService.getById('u1');

            expect(result?.overlayToken).toBe('');
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('findByPlatformId', () => {
        it('debería encontrar un usuario por proveedor y providerId', async () => {
            const mockConn = { userId: 'u1' } as Connection;
            mockConnRepo.findByProvider.mockResolvedValue(mockConn);
            mockUserRepo.findById.mockResolvedValue({ id: 'u1' } as User);

            const result = await userService.findByPlatformId('twitch', 'pid1');

            expect(result?.id).toBe('u1');
            expect(mockConnRepo.findByProvider).toHaveBeenCalledWith('twitch', 'pid1', undefined);
        });

        it('debería retornar null si no existe la conexión', async () => {
            mockConnRepo.findByProvider.mockResolvedValue(null);
            const result = await userService.findByPlatformId('twitch', 'pid1');
            expect(result).toBeNull();
        });
    });

    describe('findOrCreateFromPlatform', () => {
        const profile: PlatformProfile = {
            provider: 'twitch',
            providerId: 'pid1',
            providerUsername: 'user_one',
            displayName: 'User One',
            avatarUrl: 'http://img',
            email: 'user@test.com'
        };

        it('debería retornar el usuario si ya existe por conexión', async () => {
            mockConnRepo.findByProvider.mockResolvedValue({ userId: 'u1' } as Connection);
            mockUserRepo.findByIdWithConnections.mockResolvedValue({ id: 'u1' } as User);

            const { user, isNew } = await userService.findOrCreateFromPlatform(profile);

            expect(user.id).toBe('u1');
            expect(isNew).toBe(false);
        });

        it('debería retornar el usuario si ya existe por email', async () => {
            mockConnRepo.findByProvider.mockResolvedValue(null);
            mockUserRepo.findByEmail.mockResolvedValue({ id: 'u2' } as User);
            mockUserRepo.findByIdWithConnections.mockResolvedValue({ id: 'u2' } as User);

            const { user, isNew } = await userService.findOrCreateFromPlatform(profile);

            expect(user.id).toBe('u2');
            expect(isNew).toBe(false);
        });

        it('debería crear un nuevo usuario si no existe', async () => {
            mockConnRepo.findByProvider.mockResolvedValue(null);
            mockUserRepo.findByEmail.mockResolvedValue(null);
            mockUserRepo.usernameExists.mockResolvedValue(false);
            mockUserRepo.create.mockImplementation((data) => Promise.resolve({ ...data, id: 'new_u' } as unknown as User));

            const { user, isNew } = await userService.findOrCreateFromPlatform(profile);

            expect(user.id).toBe('new_u');
            expect(isNew).toBe(true);
            expect(mockUserRepo.create).toHaveBeenCalled();
        });

        it('debería generar un username único con sufijo si el original existe', async () => {
            mockConnRepo.findByProvider.mockResolvedValue(null);
            mockUserRepo.findByEmail.mockResolvedValue(null);

            // Simular que el username base ya existe pero el sufijo 1 no
            mockUserRepo.usernameExists
                .mockResolvedValueOnce(true)  // user_one existe
                .mockResolvedValueOnce(false); // user_one1 no existe

            mockUserRepo.create.mockResolvedValue({ id: 'u' } as User);

            await userService.findOrCreateFromPlatform(profile);

            expect(mockUserRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ username: 'user_one1' }),
                undefined
            );
        });

        it('debería generar un username aleatorio tras 10 fallos de sufijo', async () => {
            mockConnRepo.findByProvider.mockResolvedValue(null);
            mockUserRepo.findByEmail.mockResolvedValue(null);

            // Simular 11 existencias de username
            for (let i = 0; i < 11; i++) {
                mockUserRepo.usernameExists.mockResolvedValueOnce(true);
            }
            mockUserRepo.create.mockResolvedValue({ id: 'u' } as User);

            await userService.findOrCreateFromPlatform(profile);

            // Debería haber un username con caracteres aleatorios después del prefijo
            expect(mockUserRepo.create).toHaveBeenCalledWith(
                expect.objectContaining({ username: expect.stringMatching(/^user_one[a-z0-9]{5}$/) }),
                undefined
            );
        });

        it('debería retornar el usuario actual si se proporciona y existe', async () => {
            mockUserRepo.findByIdWithConnections.mockResolvedValue({ id: 'current' } as User);
            const { user } = await userService.findOrCreateFromPlatform(profile, 'current');
            expect(user.id).toBe('current');
        });
    });

    describe('updateProfileData', () => {
        it('debería actualizar solo los campos modificados incluyendo email', async () => {
            const user = { id: 'u1', displayName: 'Old', email: 'old@test.com' } as User;
            const updates = { email: 'new@test.com' };

            await userService.updateProfileData(user, updates);

            expect(mockUserRepo.update).toHaveBeenCalledWith('u1', { email: 'new@test.com' }, undefined);
        });

        it('no debería llamar a update si no hay cambios', async () => {
            const user = { id: 'u1', displayName: 'Same', email: 'same@test.com' } as User;
            const updates = { displayName: 'Same', email: 'same@test.com' };

            await userService.updateProfileData(user, updates);

            expect(mockUserRepo.update).not.toHaveBeenCalled();
        });
    });

    describe('regenerateOverlayToken', () => {
        it('debería generar y actualizar el overlayToken', async () => {
            await userService.regenerateOverlayToken('u1');

            expect(mockUserRepo.update).toHaveBeenCalledWith(
                'u1',
                expect.objectContaining({
                    overlayToken: expect.stringMatching(/^encrypted_/),
                    overlayTokenHash: expect.stringMatching(/^hashed_/)
                })
            );
        });
    });

    describe('findByOverlayToken', () => {
        it('debería encontrar un usuario por el token sin encriptar', async () => {
            mockUserRepo.findByOverlayTokenHash.mockResolvedValue({ id: 'u1', overlayToken: 'enc' } as User);

            const result = await userService.findByOverlayToken('raw_token');

            expect(mockUserRepo.findByOverlayTokenHash).toHaveBeenCalledWith('hashed_raw_token');
            expect(result?.overlayToken).toBe('decrypted_enc');
        });
    });
});
