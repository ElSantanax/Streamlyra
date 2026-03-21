import { Server, Socket } from 'socket.io';
import { MessageSocketHandler } from '../MessageSocketHandler';
import { MessageSenderService } from '../../../services/message/MessageSenderService';

type SocketEventHandler = (payload: unknown) => Promise<void>;

describe('MessageSocketHandler', () => {
    let handler: MessageSocketHandler;
    let mockMessageSenderService: jest.Mocked<MessageSenderService>;
    let mockSocket: jest.Mocked<Socket>;
    let mockIo: jest.Mocked<Server>;
    const authenticatedUserId = 'user-123';

    beforeEach(() => {
        mockMessageSenderService = {
            sendMessage: jest.fn()
        } as unknown as jest.Mocked<MessageSenderService>;

        mockSocket = {
            id: 'socket-123',
            on: jest.fn<void, [string, SocketEventHandler]>(),
            emit: jest.fn(),
            data: {}
        } as unknown as jest.Mocked<Socket>;

        mockIo = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        } as unknown as jest.Mocked<Server>;

        handler = new MessageSocketHandler(mockMessageSenderService);
    });

    const getEventHandler = (): SocketEventHandler => {
        const onMock = mockSocket.on as unknown as jest.Mock<void, [string, SocketEventHandler]>;
        return onMock.mock.calls[0][1];
    };

    describe('setupHandler', () => {
        it('debe registrar el evento send_message', () => {
            handler.setupHandler(mockSocket, mockIo, authenticatedUserId);

            expect(mockSocket.on).toHaveBeenCalledWith('send_message', expect.any(Function));
        });

        it('debe enviar mensaje exitosamente cuando el payload es válido', async () => {
            const payload = {
                userId: authenticatedUserId,
                message: 'Test message',
                platforms: ['twitch', 'youtube']
            };

            mockMessageSenderService.sendMessage.mockResolvedValue({
                success: true,
                results: [
                    { platform: 'twitch', success: true, messageId: 'msg-1' },
                    { platform: 'youtube', success: true, messageId: 'msg-2' }
                ],
                timestamp: new Date().toISOString()
            });

            handler.setupHandler(mockSocket, mockIo, authenticatedUserId);
            await getEventHandler()(payload);

            expect(mockMessageSenderService.sendMessage).toHaveBeenCalledWith({
                userId: authenticatedUserId,
                message: 'Test message',
                platforms: ['twitch', 'youtube']
            });
            expect(mockSocket.emit).toHaveBeenCalledWith('message_sent_result', expect.any(Object));
        });

        it('no debe enviar mensaje cuando el userId no coincide', async () => {
            const payload = {
                userId: 'different-user',
                message: 'Test message',
                platforms: ['twitch']
            };

            handler.setupHandler(mockSocket, mockIo, authenticatedUserId);
            await getEventHandler()(payload);

            expect(mockMessageSenderService.sendMessage).not.toHaveBeenCalled();
            expect(mockSocket.emit).toHaveBeenCalledWith('message_send_error', expect.objectContaining({
                code: 'UNAUTHORIZED'
            }));
        });

        it('no debe enviar mensaje cuando el payload es inválido', async () => {
            const invalidPayload = {
                message: 'Test message'
            };

            handler.setupHandler(mockSocket, mockIo, authenticatedUserId);
            await getEventHandler()(invalidPayload);

            expect(mockMessageSenderService.sendMessage).not.toHaveBeenCalled();
            expect(mockSocket.emit).toHaveBeenCalledWith('message_send_error', expect.objectContaining({
                code: 'INVALID_PAYLOAD'
            }));
        });

        it('debe filtrar tiktok de las plataformas', async () => {
            const payload = {
                userId: authenticatedUserId,
                message: 'Test message',
                platforms: ['twitch', 'tiktok', 'youtube']
            };

            mockMessageSenderService.sendMessage.mockResolvedValue({
                success: true,
                results: [],
                timestamp: new Date().toISOString()
            });

            handler.setupHandler(mockSocket, mockIo, authenticatedUserId);
            await getEventHandler()(payload);

            expect(mockMessageSenderService.sendMessage).toHaveBeenCalledWith({
                userId: authenticatedUserId,
                message: 'Test message',
                platforms: ['twitch', 'youtube']
            });
        });
    });
});
