import { Server, Socket } from 'socket.io';
import { setupSocketHandlers } from '../socket.handler';
import { ChatManager } from '../../services/ChatManager';
import { SocketConnectionManager } from '../SocketConnectionManager';
import { MessageSenderService } from '../../services/message/MessageSenderService';
import { logger } from '../../utils/logger';

// Mock dependencies
jest.mock('../SocketConnectionManager');
jest.mock('../../services/message/MessageSenderService');
jest.mock('../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
    }
}));

describe('socket.handler', () => {
    let mockIo: jest.Mocked<Server>;
    let mockSocket: jest.Mocked<Socket>;
    let mockChatManager: jest.Mocked<ChatManager>;
    let mockMessageSenderService: jest.Mocked<MessageSenderService>;
    let mockSocketConnectionManager: jest.Mocked<SocketConnectionManager>;

    // Helpers to capture event handlers
    let connectionHandler: (socket: Socket) => void;
    const socketEventHandlers: Record<string, (payload?: unknown) => Promise<void>> = {};

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup IO mock
        mockIo = {
            on: jest.fn((event, handler) => {
                if (event === 'connection') {
                    connectionHandler = handler;
                }
            }),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;

        // Setup Socket mock
        mockSocket = {
            id: 'socket-123',
            on: jest.fn((event, handler) => {
                socketEventHandlers[event] = handler;
            }),
            emit: jest.fn(),
        } as unknown as jest.Mocked<Socket>;

        // Setup other mocks
        mockChatManager = {} as jest.Mocked<ChatManager>;

        mockMessageSenderService = {
            sendMessage: jest.fn().mockResolvedValue({ success: true, results: [] })
        } as unknown as jest.Mocked<MessageSenderService>;

        // Setup SocketConnectionManager mock instance
        mockSocketConnectionManager = {
            handleIdentify: jest.fn(),
            getUserIdBySocketId: jest.fn(),
            handleDisconnect: jest.fn(),
        } as unknown as jest.Mocked<SocketConnectionManager>;

        (SocketConnectionManager as jest.Mock).mockImplementation(() => mockSocketConnectionManager);
    });

    const triggerConnection = () => {
        setupSocketHandlers(mockIo, mockChatManager, mockMessageSenderService);
        connectionHandler(mockSocket);
    };

    describe('send_message event', () => {
        beforeEach(() => {
            triggerConnection();
        });

        it('should emit error if payload is invalid (missing fields)', async () => {
            const invalidPayload = { userId: '123' }; // Missing message and platforms

            await socketEventHandlers['send_message'](invalidPayload);

            expect(mockSocket.emit).toHaveBeenCalledWith('message_send_error', {
                code: 'INVALID_PAYLOAD',
                message: expect.stringContaining('Datos inválidos')
            });
            expect(logger.warn).toHaveBeenCalledWith(
                expect.objectContaining({ reason: 'Invalid payload structure' }),
                expect.any(String)
            );
        });

        it('should emit error if payload has invalid types', async () => {
            const invalidPayload = {
                userId: '123',
                message: 123, // Should be string
                platforms: ['twitch']
            };

            await socketEventHandlers['send_message'](invalidPayload);

            expect(mockSocket.emit).toHaveBeenCalledWith('message_send_error', {
                code: 'INVALID_PAYLOAD',
                message: expect.stringContaining('Datos inválidos')
            });
        });

        it('should emit unauthorized error if socket is not mapped to user', async () => {
            // Mock connection manager returning null (not identified)
            mockSocketConnectionManager.getUserIdBySocketId.mockReturnValue(undefined);

            const payload = {
                userId: 'user-1',
                message: 'hello',
                platforms: ['twitch']
            };

            await socketEventHandlers['send_message'](payload);

            expect(mockSocket.emit).toHaveBeenCalledWith('message_send_error', {
                code: 'UNAUTHORIZED',
                message: 'No autorizado'
            });
            expect(logger.warn).toHaveBeenCalledWith(
                expect.objectContaining({ reason: 'UserId mismatch or no session found' }),
                expect.stringContaining('Authorization validation failed')
            );
        });

        it('should emit unauthorized error if socket user mismatch', async () => {
            mockSocketConnectionManager.getUserIdBySocketId.mockReturnValue('user-2');

            const payload = {
                userId: 'user-1', // Requesting for user-1 but socket is user-2
                message: 'hello',
                platforms: ['twitch']
            };

            await socketEventHandlers['send_message'](payload);

            expect(mockSocket.emit).toHaveBeenCalledWith('message_send_error', {
                code: 'UNAUTHORIZED',
                message: 'No autorizado'
            });
        });

        it('should process message successfully when valid', async () => {
            mockSocketConnectionManager.getUserIdBySocketId.mockReturnValue('user-1');

            const payload = {
                userId: 'user-1',
                message: 'hello world',
                platforms: ['twitch', 'kick']
            };

            const expectedResult = {
                success: true,
                results: [{ platform: 'twitch' as const, success: true }],
                timestamp: new Date().toISOString()
            };
            mockMessageSenderService.sendMessage.mockResolvedValue(expectedResult);

            await socketEventHandlers['send_message'](payload);

            // Should verify filtering of TikTok is NOT happening yet (Wait, logic says it DOES filter)
            // Code: const filteredPlatforms = platforms.filter(p => p !== 'tiktok');
            // So if I send tiktok, it should be removed.

            expect(mockMessageSenderService.sendMessage).toHaveBeenCalledWith({
                userId: 'user-1',
                message: 'hello world',
                platforms: ['twitch', 'kick']
            });

            expect(mockSocket.emit).toHaveBeenCalledWith('message_sent_result', expectedResult);
            expect(logger.info).toHaveBeenCalledWith(
                expect.objectContaining({ userId: 'user-1', success: true }),
                'Message send completed'
            );
        });

        it('should filter TikTok from platforms', async () => {
            mockSocketConnectionManager.getUserIdBySocketId.mockReturnValue('user-1');

            const payload = {
                userId: 'user-1',
                message: 'hello',
                platforms: ['twitch', 'tiktok', 'youtube']
            };

            await socketEventHandlers['send_message'](payload);

            expect(mockMessageSenderService.sendMessage).toHaveBeenCalledWith(
                expect.objectContaining({
                    platforms: ['twitch', 'youtube'] // TikTok removed
                })
            );
        });

        it('should handle logic errors gracefully', async () => {
            mockSocketConnectionManager.getUserIdBySocketId.mockReturnValue('user-1');
            mockMessageSenderService.sendMessage.mockRejectedValue(new Error('Logic error'));

            const payload = {
                userId: 'user-1',
                message: 'hello',
                platforms: ['twitch']
            };

            await socketEventHandlers['send_message'](payload);

            expect(mockSocket.emit).toHaveBeenCalledWith('message_send_error', {
                code: 'INTERNAL_ERROR',
                message: 'Error interno del servidor'
            });
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({ errorMessage: 'Logic error' }),
                expect.any(String)
            );
        });
    });

    describe('identify event', () => {
        beforeEach(() => {
            triggerConnection();
        });

        it('should call handleIdentify', async () => {
            const userId = 'user-123';
            await socketEventHandlers['identify'](userId);

            expect(mockSocketConnectionManager.handleIdentify).toHaveBeenCalledWith(
                userId,
                mockSocket,
                mockIo
            );
        });
    });

    describe('disconnect event', () => {
        beforeEach(() => {
            triggerConnection();
        });

        it('should call handleDisconnect', async () => {
            await socketEventHandlers['disconnect']();

            expect(mockSocketConnectionManager.handleDisconnect).toHaveBeenCalledWith(
                mockSocket.id
            );
        });
    });
});
