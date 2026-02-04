import { Server, Socket } from 'socket.io';
import { setupSocketHandlers } from '../socket.handler';
import { ChatManager } from '../../services/core/ChatManager';
import { SocketConnectionManager } from '../services/SocketConnectionManager';
import { MessageSenderService } from '../../services/message/MessageSenderService';
import { ActivityService } from '../../services/core/ActivityService';
import { ConnectionService } from '../../services/connection/ConnectionService';
import { YouTubeService } from '../../services/platforms/YouTubeService';
import { logger } from '../../utils/logger';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

// Mock dependencies
jest.mock('../services/SocketConnectionManager');
jest.mock('../../services/message/MessageSenderService');
jest.mock('../../services/core/ActivityService');
jest.mock('../../services/connection/ConnectionService');
jest.mock('../../services/platforms/YouTubeService');
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
    let mockActivityService: jest.Mocked<ActivityService>;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockYouTubeService: jest.Mocked<YouTubeService>;
    let mockSocketConnectionManager: jest.Mocked<SocketConnectionManager>;

    // Helpers to capture event handlers
    let connectionHandler: (socket: Socket) => void;
    type EventHandler = (payload?: unknown) => Promise<void>;
    const socketEventHandlers: Record<string, EventHandler> = {};

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup IO mock
        const mockTo = jest.fn().mockReturnThis();
        mockIo = {
            on: jest.fn((event: string, handler: (socket: Socket) => void) => {
                if (event === 'connection') {
                    connectionHandler = handler;
                }
            }),
            use: jest.fn(() => {
                // For testing purposes, we automatically call next()
            }),
            to: mockTo,
            emit: jest.fn(),
        } as unknown as jest.Mocked<Server>;

        // Setup Socket mock
        mockSocket = {
            id: 'socket-123',
            data: {},
            on: jest.fn(<T extends EventHandler>(event: string, handler: T): void => {
                socketEventHandlers[event] = handler;
            }),
            onAny: jest.fn(),
            emit: jest.fn(),
            disconnect: jest.fn(),
        } as unknown as jest.Mocked<Socket>;

        // Setup other mocks
        mockChatManager = {} as jest.Mocked<ChatManager>;

        mockMessageSenderService = {
            sendMessage: jest.fn().mockResolvedValue({ success: true, results: [] })
        } as unknown as jest.Mocked<MessageSenderService>;

        mockActivityService = {} as jest.Mocked<ActivityService>;
        mockConnectionService = {} as jest.Mocked<ConnectionService>;
        mockYouTubeService = {} as jest.Mocked<YouTubeService>;

        // Setup SocketConnectionManager mock instance
        mockSocketConnectionManager = {
            handleIdentify: jest.fn(),
            getUserIdBySocketId: jest.fn(),
            handleDisconnect: jest.fn(),
        } as unknown as jest.Mocked<SocketConnectionManager>;

        (SocketConnectionManager as jest.Mock).mockImplementation(() => mockSocketConnectionManager);
    });

    const triggerConnection = (userId: string = '550e8400-e29b-41d4-a716-446655440021') => {
        setupSocketHandlers(
            mockIo,
            mockChatManager,
            mockMessageSenderService,
            mockActivityService,
            mockConnectionService,
            mockYouTubeService
        );
        // Simulate middleware setting userId
        (mockSocket.data as { userId?: string }).userId = userId;
        connectionHandler(mockSocket);
    };

    describe('send_message event', () => {
        beforeEach(() => {
            triggerConnection();
        });

        it('should emit error if payload is invalid (missing fields)', async () => {
            const invalidPayload: Record<string, unknown> = { userId: '550e8400-e29b-41d4-a716-446655440021' }; // Missing message and platforms

            const handler = socketEventHandlers['send_message'];
            if (handler) {
                await handler(invalidPayload);
            }

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
            const invalidPayload: Record<string, unknown> = {
                userId: '550e8400-e29b-41d4-a716-446655440021',
                message: 123, // Should be string
                platforms: ['twitch']
            };

            const handler = socketEventHandlers['send_message'];
            if (handler) {
                await handler(invalidPayload);
            }

            expect(mockSocket.emit).toHaveBeenCalledWith('message_send_error', {
                code: 'INVALID_PAYLOAD',
                message: expect.stringContaining('Datos inválidos')
            });
        });

        it('should emit unauthorized error if socket user mismatch', async () => {
            // Trigger connection as user-22
            const userId2 = '550e8400-e29b-41d4-a716-446655440022';
            triggerConnection(userId2);

            const payload = {
                userId: '550e8400-e29b-41d4-a716-446655440021', // Requesting for user-21 but socket is user-22
                message: 'hello',
                platforms: ['twitch']
            };

            await socketEventHandlers['send_message'](payload);

            expect(mockSocket.emit).toHaveBeenCalledWith('message_send_error', {
                code: 'UNAUTHORIZED',
                message: expect.stringContaining('No autorizado')
            });
            expect(logger.warn).toHaveBeenCalledWith(
                expect.objectContaining({ reason: 'UserId spoofing attempt' }),
                expect.stringContaining('SECURITY: Blocked attempt to send message as another user')
            );
        });

        it('should process message successfully when valid', async () => {
            const userId = '550e8400-e29b-41d4-a716-446655440021';
            const payload = {
                userId: userId,
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

            // Verificar que se emitió el mensaje al dashboard ANTES de enviar a plataformas (feedback optimista)
            expect(mockIo.to).toHaveBeenCalledWith(userId);
            expect(mockIo.emit).toHaveBeenCalledWith('chat_message', expect.objectContaining({
                platform: 'dashboard',
                user: 'Tú',
                message: 'hello world',
                isOwner: true
            }));

            // Verificar que se envió a las plataformas
            expect(mockMessageSenderService.sendMessage).toHaveBeenCalledWith({
                userId: userId,
                message: 'hello world',
                platforms: ['twitch', 'kick']
            });

            // Verificar que se emitió el resultado
            expect(mockSocket.emit).toHaveBeenCalledWith('message_sent_result', expectedResult);

            expect(logger.info).toHaveBeenCalledWith(
                expect.objectContaining({ userId: userId, success: true }),
                'Message send completed'
            );
        });

        it('should filter TikTok from platforms', async () => {
            const userId = '550e8400-e29b-41d4-a716-446655440021';
            const payload = {
                userId: userId,
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
            const userId = '550e8400-e29b-41d4-a716-446655440021';
            mockMessageSenderService.sendMessage.mockRejectedValue(new Error('Logic error'));

            const payload = {
                userId: userId,
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
            triggerConnection('550e8400-e29b-41d4-a716-446655440020'); // Identify as mockUserId during connection
        });

        it('should have called handleIdentify during connection', () => {
            expect(mockSocketConnectionManager.handleIdentify).toHaveBeenCalledWith(
                '550e8400-e29b-41d4-a716-446655440020',
                mockSocket,
                mockIo
            );
        });

        it('should emit identified when identify event is received', async () => {
            await socketEventHandlers['identify']();

            expect(mockSocket.emit).toHaveBeenCalledWith('identified', {
                userId: '550e8400-e29b-41d4-a716-446655440020',
                message: expect.any(String)
            });
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
