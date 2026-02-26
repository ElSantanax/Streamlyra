import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { createAuthMiddleware } from '../SocketAuthMiddleware';
import { UserService } from '../../../services/user/UserService';
import { User } from '../../../models/User.model';

jest.mock('jsonwebtoken');
jest.mock('../../../config', () => ({
    config: {
        jwtSecret: 'test-secret-key'
    }
}));
jest.mock('../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('SocketAuthMiddleware', () => {
    let mockUserService: jest.Mocked<UserService>;
    let mockSocket: Partial<Socket>;
    let mockNext: jest.Mock;
    let authMiddleware: ReturnType<typeof createAuthMiddleware>;

    const createMockUser = (overrides?: Partial<User>): User => ({
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        email: 'test@example.com',
        avatarUrl: 'https://example.com/avatar.png',
        overlayToken: 'overlay-token-123',
        overlayTokenHash: 'hash-123',
        ...overrides
    } as User);

    beforeEach(() => {
        jest.clearAllMocks();

        mockUserService = {
            findByOverlayToken: jest.fn()
        } as unknown as jest.Mocked<UserService>;

        mockSocket = {
            id: 'socket-123',
            handshake: {
                auth: {},
                query: {},
                headers: {},
                time: new Date().toISOString(),
                address: '127.0.0.1',
                xdomain: false,
                secure: false,
                issued: Date.now(),
                url: '/socket.io/'
            },
            data: {}
        };

        mockNext = jest.fn();
        authMiddleware = createAuthMiddleware(mockUserService);
    });

    describe('autenticación por Overlay Token', () => {
        it('debe autenticar correctamente con overlay token en auth', async () => {
            const mockUser = createMockUser();
            mockSocket.handshake!.auth = { overlayToken: 'valid-overlay-token' };
            mockUserService.findByOverlayToken.mockResolvedValue(mockUser);

            await authMiddleware(mockSocket as Socket, mockNext);

            expect(mockUserService.findByOverlayToken).toHaveBeenCalledWith('valid-overlay-token');
            expect(mockSocket.data).toEqual({ userId: 'user-123' });
            expect(mockNext).toHaveBeenCalledWith();
        });

        it('debe autenticar correctamente con overlay token en query', async () => {
            const mockUser = createMockUser();
            mockSocket.handshake!.query = { overlayToken: 'valid-overlay-token' };
            mockUserService.findByOverlayToken.mockResolvedValue(mockUser);

            await authMiddleware(mockSocket as Socket, mockNext);

            expect(mockUserService.findByOverlayToken).toHaveBeenCalledWith('valid-overlay-token');
            expect(mockSocket.data).toEqual({ userId: 'user-123' });
            expect(mockNext).toHaveBeenCalledWith();
        });

        it('debe continuar con JWT cuando overlay token es inválido', async () => {
            mockSocket.handshake!.auth = { overlayToken: 'invalid-token', token: 'jwt-token' };
            mockUserService.findByOverlayToken.mockResolvedValue(null);
            (jwt.verify as jest.Mock).mockReturnValue({ id: 'user-456' });

            await authMiddleware(mockSocket as Socket, mockNext);

            expect(mockUserService.findByOverlayToken).toHaveBeenCalledWith('invalid-token');
            expect(jwt.verify).toHaveBeenCalledWith('jwt-token', 'test-secret-key');
            expect(mockSocket.data).toEqual({ userId: 'user-456' });
        });

        it('debe continuar con JWT cuando findByOverlayToken lanza error', async () => {
            mockSocket.handshake!.auth = { overlayToken: 'error-token', token: 'jwt-token' };
            mockUserService.findByOverlayToken.mockRejectedValue(new Error('Database error'));
            (jwt.verify as jest.Mock).mockReturnValue({ id: 'user-789' });

            await authMiddleware(mockSocket as Socket, mockNext);

            expect(jwt.verify).toHaveBeenCalledWith('jwt-token', 'test-secret-key');
            expect(mockSocket.data).toEqual({ userId: 'user-789' });
        });
    });

    describe('autenticación por JWT', () => {
        it('debe autenticar correctamente con JWT en auth', async () => {
            mockSocket.handshake!.auth = { token: 'valid-jwt-token' };
            (jwt.verify as jest.Mock).mockReturnValue({ id: 'user-123' });

            await authMiddleware(mockSocket as Socket, mockNext);

            expect(jwt.verify).toHaveBeenCalledWith('valid-jwt-token', 'test-secret-key');
            expect(mockSocket.data).toEqual({ userId: 'user-123' });
            expect(mockNext).toHaveBeenCalledWith();
        });

        it('debe autenticar correctamente con JWT en header Authorization', async () => {
            mockSocket.handshake!.headers = { authorization: 'Bearer valid-jwt-token' };
            (jwt.verify as jest.Mock).mockReturnValue({ id: 'user-456' });

            await authMiddleware(mockSocket as Socket, mockNext);

            expect(jwt.verify).toHaveBeenCalledWith('valid-jwt-token', 'test-secret-key');
            expect(mockSocket.data).toEqual({ userId: 'user-456' });
        });

        it('debe autenticar correctamente con JWT en cookie', async () => {
            mockSocket.handshake!.headers = { cookie: 'auth_token=valid-jwt-token; other=value' };
            (jwt.verify as jest.Mock).mockReturnValue({ id: 'user-789' });

            await authMiddleware(mockSocket as Socket, mockNext);

            expect(jwt.verify).toHaveBeenCalledWith('valid-jwt-token', 'test-secret-key');
            expect(mockSocket.data).toEqual({ userId: 'user-789' });
        });

        it('debe rechazar conexión cuando JWT es inválido', async () => {
            mockSocket.handshake!.auth = { token: 'invalid-jwt-token' };
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await authMiddleware(mockSocket as Socket, mockNext);

            expect(mockNext).toHaveBeenCalledWith(new Error('Authentication error: Invalid token'));
            expect(mockSocket.data).toEqual({});
        });
    });

    describe('casos de error', () => {
        it('debe rechazar conexión cuando no hay token', async () => {
            await authMiddleware(mockSocket as Socket, mockNext);

            expect(mockNext).toHaveBeenCalledWith(new Error('Authentication error: Token required'));
            expect(mockSocket.data).toEqual({});
        });

        it('debe rechazar conexión cuando cookie header está vacío', async () => {
            mockSocket.handshake!.headers = { cookie: '' };

            await authMiddleware(mockSocket as Socket, mockNext);

            expect(mockNext).toHaveBeenCalledWith(new Error('Authentication error: Token required'));
        });

        it('debe rechazar conexión cuando cookie no contiene auth_token', async () => {
            mockSocket.handshake!.headers = { cookie: 'other=value; session=123' };

            await authMiddleware(mockSocket as Socket, mockNext);

            expect(mockNext).toHaveBeenCalledWith(new Error('Authentication error: Token required'));
        });
    });

    describe('prioridad de autenticación', () => {
        it('debe priorizar overlay token sobre JWT cuando ambos están presentes', async () => {
            const mockUser = createMockUser();
            mockSocket.handshake!.auth = { overlayToken: 'overlay-token', token: 'jwt-token' };
            mockUserService.findByOverlayToken.mockResolvedValue(mockUser);

            await authMiddleware(mockSocket as Socket, mockNext);

            expect(mockUserService.findByOverlayToken).toHaveBeenCalledWith('overlay-token');
            expect(jwt.verify).not.toHaveBeenCalled();
            expect(mockSocket.data).toEqual({ userId: 'user-123' });
        });

        it('debe priorizar overlay token en auth sobre query', async () => {
            const mockUser = createMockUser();
            mockSocket.handshake!.auth = { overlayToken: 'auth-overlay-token' };
            mockSocket.handshake!.query = { overlayToken: 'query-overlay-token' };
            mockUserService.findByOverlayToken.mockResolvedValue(mockUser);

            await authMiddleware(mockSocket as Socket, mockNext);

            expect(mockUserService.findByOverlayToken).toHaveBeenCalledWith('auth-overlay-token');
        });

        it('debe priorizar JWT en auth sobre header Authorization', async () => {
            mockSocket.handshake!.auth = { token: 'auth-jwt-token' };
            mockSocket.handshake!.headers = { authorization: 'Bearer header-jwt-token' };
            (jwt.verify as jest.Mock).mockReturnValue({ id: 'user-123' });

            await authMiddleware(mockSocket as Socket, mockNext);

            expect(jwt.verify).toHaveBeenCalledWith('auth-jwt-token', 'test-secret-key');
        });
    });
});
