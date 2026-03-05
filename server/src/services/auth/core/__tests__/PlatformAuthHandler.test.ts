import { PlatformAuthHandler } from '../PlatformAuthHandler';
import { UserService } from '../../../user/UserService';
import { AuthDTOBuilder } from '../../AuthDTOBuilder';
import { IConnectionRepository } from '../../../../repositories/interfaces/IConnectionRepository';
import { PlatformProfile, AuthTokens } from '../../../../types';
import { Platform } from '../../../../constants/platforms';
import db from '../../../../config/db';
import { UniqueConstraintError } from 'sequelize';
import { User } from '../../../../models/User.model';
import { Connection } from '../../../../models/Connection.model';
import { UserDTO } from '../../../../utils/userUtils';

jest.mock('../../../user/UserService');
jest.mock('../../AuthDTOBuilder');
jest.mock('../../../../config/db', () => ({
    transaction: jest.fn()
}));
jest.mock('../../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    }
}));

describe('PlatformAuthHandler', () => {
    let handler: PlatformAuthHandler;
    let mockUserService: jest.Mocked<UserService>;
    let mockConnRepo: jest.Mocked<IConnectionRepository>;
    let mockDTOBuilder: jest.Mocked<AuthDTOBuilder>;

    const profile: PlatformProfile = {
        provider: 'twitch',
        providerId: 'pid1',
        providerUsername: 'user1',
        displayName: 'User 1',
        avatarUrl: 'http://img',
        email: 'u1@test.com'
    };

    const tokens: AuthTokens = {
        access_token: 'at',
        refresh_token: 'rt',
        expires_in: 3600
    };

    beforeEach(() => {
        mockUserService = {
            findOrCreateFromPlatform: jest.fn(),
            updateProfileData: jest.fn()
        } as unknown as jest.Mocked<UserService>;

        mockConnRepo = {
            createOrUpdate: jest.fn(),
            findByProvider: jest.fn(),
            findByUserId: jest.fn(),
            delete: jest.fn(),
            updateTokens: jest.fn()
        } as unknown as jest.Mocked<IConnectionRepository>;

        mockDTOBuilder = {
            buildAuthResponse: jest.fn(),
            buildUserProfile: jest.fn()
        } as unknown as jest.Mocked<AuthDTOBuilder>;

        handler = new PlatformAuthHandler(mockUserService, mockConnRepo, mockDTOBuilder);

        (db.transaction as jest.Mock).mockImplementation(async (callback) => {
            return await callback('fake-transaction');
        });

        mockDTOBuilder.buildAuthResponse.mockImplementation((user, active, reason) => ({
            token: 'fake-token',
            user: { id: user.id } as unknown as UserDTO,
            connectionActive: active,
            activationReason: reason
        }));
    });

    it('debería manejar autenticación exitosa para un nuevo usuario', async () => {
        mockUserService.findOrCreateFromPlatform.mockResolvedValue({
            user: { id: 'u1' } as User,
            isNew: true
        });

        await handler.handlePlatformAuth(profile, tokens);

        expect(mockConnRepo.createOrUpdate).toHaveBeenCalledWith(
            'u1', profile.provider, profile.providerId, profile.providerUsername, tokens, 'fake-transaction'
        );
        expect(mockUserService.updateProfileData).toHaveBeenCalled();
        expect(mockDTOBuilder.buildAuthResponse).toHaveBeenCalledWith(
            expect.anything(), true, 'new_user'
        );
    });

    it('debería manejar vinculación explícita (currentUserId)', async () => {
        mockUserService.findOrCreateFromPlatform.mockResolvedValue({
            user: { id: 'u1' } as unknown as User,
            isNew: false
        });

        await handler.handlePlatformAuth(profile, tokens, 'u1');

        expect(mockDTOBuilder.buildAuthResponse).toHaveBeenCalledWith(
            expect.anything(), true, 'explicit_link'
        );
    });

    it('debería recuperarse de UniqueConstraintError en la creación de conexión', async () => {
        mockUserService.findOrCreateFromPlatform.mockResolvedValue({
            user: { id: 'u1' } as User,
            isNew: true
        });
        mockConnRepo.createOrUpdate.mockRejectedValue(new UniqueConstraintError({}));

        const result = await handler.handlePlatformAuth(profile, tokens);

        expect(result).toBeDefined();
        // No lanza error, se recupera
    });

    it('debería lanzar error si falla la creación de conexión por otra causa', async () => {
        mockUserService.findOrCreateFromPlatform.mockResolvedValue({
            user: { id: 'u1' } as User,
            isNew: true
        });
        mockConnRepo.createOrUpdate.mockRejectedValue(new Error('Fatal error'));

        await expect(handler.handlePlatformAuth(profile, tokens)).rejects.toThrow('Fatal error');
    });

    it('debería saltar la sincronización de perfil si no es Twitch y no es nuevo', async () => {
        const kickProfile = { ...profile, provider: 'kick' as Platform };
        mockUserService.findOrCreateFromPlatform.mockResolvedValue({
            user: { id: 'u1', connections: [{ provider: 'twitch' }] } as User,
            isNew: false,
            existingConnection: { id: 'c1' } as Connection
        });

        await handler.handlePlatformAuth(kickProfile, tokens);

        expect(mockUserService.updateProfileData).not.toHaveBeenCalled();
    });

    it('debería sincronizar perfil si es Kick pero el usuario es nuevo y no tiene Twitch', async () => {
        const kickProfile = { ...profile, provider: 'kick' as Platform };
        mockUserService.findOrCreateFromPlatform.mockResolvedValue({
            user: { id: 'u1', connections: [] } as unknown as User,
            isNew: true
        });

        await handler.handlePlatformAuth(kickProfile, tokens);

        expect(mockUserService.updateProfileData).toHaveBeenCalled();
    });

    it('debería saltar la activación si se encuentra por email sin conexión previa y no hay currentUserId', async () => {
        mockUserService.findOrCreateFromPlatform.mockResolvedValue({
            user: { id: 'u_email', connections: [] } as unknown as User,
            isNew: false,
            existingConnection: undefined
        });

        const res = await handler.handlePlatformAuth(profile, tokens);

        expect(mockConnRepo.createOrUpdate).not.toHaveBeenCalled();
        expect(res.connectionActive).toBe(false);
    });

    it('debería recuperarse de código de error 23505 (Postgres unique constraint)', async () => {
        mockUserService.findOrCreateFromPlatform.mockResolvedValue({
            user: { id: 'u1' } as User,
            isNew: true
        });
        const error = new Error('Unique violation');
        (error as { code?: string }).code = '23505';
        mockConnRepo.createOrUpdate.mockRejectedValue(error);

        const result = await handler.handlePlatformAuth(profile, tokens);
        expect(result).toBeDefined();
    });

    it('debería sincronizar perfil siempre si el proveedor es Twitch', async () => {
        mockUserService.findOrCreateFromPlatform.mockResolvedValue({
            user: { id: 'u1', connections: [{ provider: 'twitch' }] } as User,
            isNew: false,
            existingConnection: { id: 'c1' } as Connection
        });

        await handler.handlePlatformAuth(profile, tokens); // profile.provider es 'twitch'

        expect(mockUserService.updateProfileData).toHaveBeenCalled();
    });

    it('debería manejar errores de transacción y relanzarlos', async () => {
        (db.transaction as jest.Mock).mockRejectedValue(new Error('Transaction failed'));

        await expect(handler.handlePlatformAuth(profile, tokens)).rejects.toThrow('Transaction failed');
    });
});
