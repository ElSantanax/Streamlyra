import { UserService } from '../UserService';
import { IUserRepository } from '../../../repositories/interfaces/IUserRepository';
import { IConnectionRepository } from '../../../repositories/interfaces/IConnectionRepository';
import { User } from '../../../models/User.model';
import { PlatformProfile } from '../../../types';
import { Connection } from '../../../models/Connection.model';

// Mock dependencias
const mockUserRepository = {
    findByIdWithConnections: jest.fn(),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    usernameExists: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
} as unknown as jest.Mocked<IUserRepository>;

const mockConnectionRepository = {
    findByProvider: jest.fn(),
} as unknown as jest.Mocked<IConnectionRepository>;

describe('UserService', () => {
    let service: UserService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new UserService(mockUserRepository, mockConnectionRepository);
    });

    describe('getById', () => {
        it('should call userRepository.findByIdWithConnections', async () => {
            const userId = 'user-1';
            const mockUser = { id: userId } as User;
            mockUserRepository.findByIdWithConnections.mockResolvedValue(mockUser);

            const result = await service.getById(userId);

            expect(mockUserRepository.findByIdWithConnections).toHaveBeenCalledWith(userId);
            expect(result).toBe(mockUser);
        });
    });

    describe('findByPlatformId', () => {
        it('should return null if connection not found', async () => {
            mockConnectionRepository.findByProvider.mockResolvedValue(null);

            const result = await service.findByPlatformId('twitch', '12345');

            expect(result).toBeNull();
        });

        it('should return user if connection found', async () => {
            const mockConnection = { userId: 'user-1' } as Connection;
            const mockUser = { id: 'user-1' } as User;

            mockConnectionRepository.findByProvider.mockResolvedValue(mockConnection);
            mockUserRepository.findById.mockResolvedValue(mockUser);

            const result = await service.findByPlatformId('twitch', '12345');

            expect(mockConnectionRepository.findByProvider).toHaveBeenCalledWith('twitch', '12345', undefined);
            expect(mockUserRepository.findById).toHaveBeenCalledWith('user-1', undefined);
            expect(result).toBe(mockUser);
        });
    });

    describe('findByEmail', () => {
        it('should call userRepository.findByEmail', async () => {
            const email = 'test@example.com';
            const mockUser = { id: 'user-1', email } as User;
            mockUserRepository.findByEmail.mockResolvedValue(mockUser);

            const result = await service.findByEmail(email);

            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(email, undefined);
            expect(result).toBe(mockUser);
        });
    });

    describe('findOrCreateFromPlatform', () => {
        const profile: PlatformProfile = {
            provider: 'twitch',
            providerId: '12345',
            providerUsername: 'TestUser',
            displayName: 'Test User',
            email: 'test@example.com',
            avatarUrl: 'http://avatar.url'
        };

        it('should return existing user if currently logged in (linking)', async () => {
            const currentUserId = 'user-1';
            const mockUser = { id: currentUserId } as User;
            mockUserRepository.findById.mockResolvedValue(mockUser);

            const result = await service.findOrCreateFromPlatform(profile, currentUserId);

            expect(mockUserRepository.findById).toHaveBeenCalledWith(currentUserId, undefined);
            expect(result).toEqual({ user: mockUser, isNew: false });
        });

        it('should return existing user if found by connection', async () => {
            const mockConnection = { userId: 'user-1' } as Connection;
            const mockUser = { id: 'user-1' } as User;

            mockConnectionRepository.findByProvider.mockResolvedValue(mockConnection);
            mockUserRepository.findById.mockResolvedValue(mockUser);

            const result = await service.findOrCreateFromPlatform(profile);

            expect(mockConnectionRepository.findByProvider).toHaveBeenCalledWith(profile.provider, profile.providerId, undefined);
            expect(result).toEqual({ user: mockUser, isNew: false });
        });

        it('should return existing user if found by email', async () => {
            mockConnectionRepository.findByProvider.mockResolvedValue(null);
            const mockUser = { id: 'user-1', email: profile.email } as User;
            mockUserRepository.findByEmail.mockResolvedValue(mockUser);

            const result = await service.findOrCreateFromPlatform(profile);

            expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(profile.email, undefined);
            expect(result).toEqual({ user: mockUser, isNew: false });
        });

        it('should create new user if not found', async () => {
            mockConnectionRepository.findByProvider.mockResolvedValue(null); // No conn
            mockUserRepository.findByEmail.mockResolvedValue(null); // No email match
            mockUserRepository.usernameExists.mockResolvedValue(false); // Username free

            const newUser = { id: 'new-user', username: 'testuser' } as User;
            mockUserRepository.create.mockResolvedValue(newUser);

            const result = await service.findOrCreateFromPlatform(profile);

            expect(mockUserRepository.create).toHaveBeenCalledWith({
                username: 'testuser',
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
                email: profile.email
            }, undefined);
            expect(result).toEqual({ user: newUser, isNew: true });
        });

        it('should increment username suffix if username exists', async () => {
            mockConnectionRepository.findByProvider.mockResolvedValue(null);
            mockUserRepository.findByEmail.mockResolvedValue(null);

            // First call returns true (exists), second false (free)
            mockUserRepository.usernameExists
                .mockResolvedValueOnce(true)
                .mockResolvedValueOnce(false);

            const newUser = { id: 'new-user', username: 'testuser1' } as User;
            mockUserRepository.create.mockResolvedValue(newUser);

            await service.findOrCreateFromPlatform(profile);

            expect(mockUserRepository.usernameExists).toHaveBeenCalledTimes(2);
            expect(mockUserRepository.create).toHaveBeenCalledWith(expect.objectContaining({
                username: 'testuser1'
            }), undefined);
        });
    });

    describe('updateProfileData', () => {
        it('should update user if avatar or display name changed', async () => {
            const user = { id: 'user-1', avatarUrl: 'old-url', displayName: 'Old Name' } as User;
            const newProfile = { avatarUrl: 'new-url', displayName: 'New Name' };

            await service.updateProfileData(user, newProfile);

            expect(mockUserRepository.update).toHaveBeenCalledWith('user-1', {
                avatarUrl: 'new-url',
                displayName: 'New Name'
            }, undefined);
        });

        it('should NOT update user if nothing changed', async () => {
            const user = { id: 'user-1', avatarUrl: 'same-url', displayName: 'Same Name' } as User;
            const sameProfile = { avatarUrl: 'same-url', displayName: 'Same Name' };

            await service.updateProfileData(user, sameProfile);

            expect(mockUserRepository.update).not.toHaveBeenCalled();
        });
    });
});
