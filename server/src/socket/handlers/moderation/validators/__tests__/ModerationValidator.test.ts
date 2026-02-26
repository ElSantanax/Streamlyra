import { Socket } from 'socket.io';
import { ModerationValidator } from '../ModerationValidator';
import { Connection } from '../../../../../models/Connection.model';
import { ConnectionService } from '../../../../../services/connection/ConnectionService';
import { Platform } from '../../../../../constants/platforms';

jest.mock('../../../../../models/Connection.model');

describe('ModerationValidator', () => {
    let validator: ModerationValidator;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockSocket: Partial<Socket>;

    const createMockConnection = (overrides?: Partial<Connection>): Connection => ({
        id: 'conn-123',
        provider: 'twitch',
        providerId: 'provider-123',
        providerUsername: 'testuser',
        chatroomId: 'chatroom-123',
        accessToken: 'access-token-123',
        refreshToken: 'refresh-token-123',
        expiryDate: new Date(Date.now() + 10 * 60 * 1000),
        userId: 'user-123',
        ...overrides
    } as Connection);

    beforeEach(() => {
        jest.clearAllMocks();

        mockConnectionService = {
            getValidAccessToken: jest.fn()
        } as unknown as jest.Mocked<ConnectionService>;

        mockSocket = {
            emit: jest.fn()
        };

        validator = new ModerationValidator(mockConnectionService);
    });

    describe('validateAndGetToken', () => {
        it('debe retornar conexión y token cuando validación es exitosa', async () => {
            const mockConnection = createMockConnection();
            const platform: Platform = 'twitch';
            const userId = 'user-123';
            const validToken = 'valid-access-token';

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue(validToken);

            const result = await validator.validateAndGetToken(
                mockSocket as Socket,
                userId,
                platform
            );

            expect(Connection.findOne).toHaveBeenCalledWith({
                where: { userId, provider: platform }
            });
            expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledWith(userId, platform);
            expect(result).toEqual({
                connection: mockConnection,
                token: validToken
            });
            expect(mockSocket.emit).not.toHaveBeenCalled();
        });

        it('debe retornar null y emitir error cuando no existe conexión', async () => {
            const platform: Platform = 'youtube';
            const userId = 'user-456';

            (Connection.findOne as jest.Mock).mockResolvedValue(null);

            const result = await validator.validateAndGetToken(
                mockSocket as Socket,
                userId,
                platform
            );

            expect(Connection.findOne).toHaveBeenCalledWith({
                where: { userId, provider: platform }
            });
            expect(mockConnectionService.getValidAccessToken).not.toHaveBeenCalled();
            expect(result).toBeNull();
            expect(mockSocket.emit).toHaveBeenCalledWith('moderation_error', {
                code: 'NO_CONNECTION',
                message: 'No tienes una conexión de youtube activa'
            });
        });

        it('debe retornar null y emitir error cuando token es inválido', async () => {
            const mockConnection = createMockConnection();
            const platform: Platform = 'kick';
            const userId = 'user-789';

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue(null);

            const result = await validator.validateAndGetToken(
                mockSocket as Socket,
                userId,
                platform
            );

            expect(Connection.findOne).toHaveBeenCalledWith({
                where: { userId, provider: platform }
            });
            expect(mockConnectionService.getValidAccessToken).toHaveBeenCalledWith(userId, platform);
            expect(result).toBeNull();
            expect(mockSocket.emit).toHaveBeenCalledWith('moderation_error', {
                code: 'INVALID_TOKEN',
                message: 'Token de kick inválido o expirado'
            });
        });

        it('debe validar correctamente para diferentes plataformas', async () => {
            const platforms: Platform[] = ['twitch', 'youtube', 'kick'];

            for (const platform of platforms) {
                jest.clearAllMocks();

                const mockConnection = createMockConnection({ provider: platform });
                const validToken = `${platform}-token`;

                (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
                mockConnectionService.getValidAccessToken.mockResolvedValue(validToken);

                const result = await validator.validateAndGetToken(
                    mockSocket as Socket,
                    'user-123',
                    platform
                );

                expect(result).toEqual({
                    connection: mockConnection,
                    token: validToken
                });
            }
        });

        it('debe manejar correctamente cuando token expirado es refrescado', async () => {
            const mockConnection = createMockConnection({
                expiryDate: new Date(Date.now() - 1000)
            });
            const platform: Platform = 'twitch';
            const userId = 'user-123';
            const refreshedToken = 'refreshed-access-token';

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            mockConnectionService.getValidAccessToken.mockResolvedValue(refreshedToken);

            const result = await validator.validateAndGetToken(
                mockSocket as Socket,
                userId,
                platform
            );

            expect(result).toEqual({
                connection: mockConnection,
                token: refreshedToken
            });
            expect(mockSocket.emit).not.toHaveBeenCalled();
        });
    });
});
