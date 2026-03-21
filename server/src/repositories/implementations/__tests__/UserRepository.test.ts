import { UserRepository } from '../UserRepository';
import { User } from '../../../models/User.model';
import { Connection } from '../../../models/Connection.model';
import { UserAnalytics } from '../../../models/UserAnalytics.model';

jest.mock('../../../models/User.model');
jest.mock('../../../models/Connection.model');
jest.mock('../../../models/UserAnalytics.model');

describe('UserRepository', () => {
    let repository: UserRepository;

    const mockUser = {
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        avatarUrl: 'https://example.com/avatar.jpg',
        overlayToken: 'overlay-token',
        overlayTokenHash: 'hashed-token',
        update: jest.fn().mockResolvedValue(undefined)
    };

    beforeEach(() => {
        jest.clearAllMocks();
        repository = new UserRepository();
    });

    describe('findByIdWithConnections', () => {
        it('debe encontrar usuario con conexiones y analytics', async () => {
            (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

            const result = await repository.findByIdWithConnections('user-123');

            expect(User.findByPk).toHaveBeenCalledWith('user-123', {
                include: [
                    { model: Connection, attributes: ['provider', 'providerUsername', 'createdAt'] },
                    {
                        model: UserAnalytics,
                        attributes: [
                            'userId',
                            'lastFollowerName',
                            'lastFollowerPlatform',
                            'lastFollowerAt',
                            'lastRaidName',
                            'lastRaidPlatform',
                            'lastRaidViewers',
                            'lastRaidAt'
                        ]
                    }
                ],
                transaction: undefined
            });
            expect(result).toEqual(mockUser);
        });

        it('debe retornar null cuando el usuario no existe', async () => {
            (User.findByPk as jest.Mock).mockResolvedValue(null);

            const result = await repository.findByIdWithConnections('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('findById', () => {
        it('debe encontrar usuario por id', async () => {
            (User.findByPk as jest.Mock).mockResolvedValue(mockUser);

            const result = await repository.findById('user-123');

            expect(User.findByPk).toHaveBeenCalledWith('user-123', { transaction: undefined });
            expect(result).toEqual(mockUser);
        });

        it('debe retornar null cuando no existe', async () => {
            (User.findByPk as jest.Mock).mockResolvedValue(null);

            const result = await repository.findById('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('findByEmail', () => {
        it('debe encontrar usuario por email', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(mockUser);

            const result = await repository.findByEmail('test@example.com');

            expect(User.findOne).toHaveBeenCalledWith({
                where: { email: 'test@example.com' },
                transaction: undefined
            });
            expect(result).toEqual(mockUser);
        });

        it('debe retornar null cuando no existe', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(null);

            const result = await repository.findByEmail('nonexistent@example.com');

            expect(result).toBeNull();
        });
    });

    describe('findByUsername', () => {
        it('debe encontrar usuario por username', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(mockUser);

            const result = await repository.findByUsername('testuser');

            expect(User.findOne).toHaveBeenCalledWith({
                where: { username: 'testuser' },
                transaction: undefined
            });
            expect(result).toEqual(mockUser);
        });

        it('debe retornar null cuando no existe', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(null);

            const result = await repository.findByUsername('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('debe crear usuario con datos completos', async () => {
            const userData = {
                username: 'newuser',
                displayName: 'New User',
                email: 'new@example.com',
                avatarUrl: 'https://example.com/new-avatar.jpg',
                overlayToken: 'new-token',
                overlayTokenHash: 'new-hash'
            };

            (User.create as jest.Mock).mockResolvedValue({ ...mockUser, ...userData });

            const result = await repository.create(userData);

            expect(User.create).toHaveBeenCalledWith(userData, { transaction: undefined });
            expect(result.username).toBe('newuser');
        });

        it('debe crear usuario con datos mínimos', async () => {
            const userData = {
                username: 'minimaluser'
            };

            (User.create as jest.Mock).mockResolvedValue({ ...mockUser, ...userData });

            const result = await repository.create(userData);

            expect(User.create).toHaveBeenCalledWith(userData, { transaction: undefined });
            expect(result.username).toBe('minimaluser');
        });
    });

    describe('update', () => {
        it('debe actualizar usuario existente', async () => {
            const updateData = {
                displayName: 'Updated Name',
                email: 'updated@example.com'
            };

            (User.findByPk as jest.Mock).mockResolvedValue(mockUser);
            mockUser.update.mockResolvedValue({ ...mockUser, ...updateData });

            const result = await repository.update('user-123', updateData);

            expect(User.findByPk).toHaveBeenCalledWith('user-123', { transaction: undefined });
            expect(mockUser.update).toHaveBeenCalledWith(updateData, { transaction: undefined });
            expect(result).toBeDefined();
        });

        it('debe retornar null cuando el usuario no existe', async () => {
            (User.findByPk as jest.Mock).mockResolvedValue(null);

            const result = await repository.update('nonexistent', { displayName: 'Test' });

            expect(result).toBeNull();
        });
    });

    describe('usernameExists', () => {
        it('debe retornar true cuando el username existe', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(mockUser);

            const result = await repository.usernameExists('testuser');

            expect(result).toBe(true);
        });

        it('debe retornar false cuando el username no existe', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(null);

            const result = await repository.usernameExists('nonexistent');

            expect(result).toBe(false);
        });
    });

    describe('findByOverlayTokenHash', () => {
        it('debe encontrar usuario por overlay token hash', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(mockUser);

            const result = await repository.findByOverlayTokenHash('hashed-token');

            expect(User.findOne).toHaveBeenCalledWith({
                where: { overlayTokenHash: 'hashed-token' },
                transaction: undefined
            });
            expect(result).toEqual(mockUser);
        });

        it('debe retornar null cuando no existe', async () => {
            (User.findOne as jest.Mock).mockResolvedValue(null);

            const result = await repository.findByOverlayTokenHash('invalid-hash');

            expect(result).toBeNull();
        });
    });
});
