import { Server, Socket } from 'socket.io';
import { ConnectionSocketHandler } from '../ConnectionSocketHandler';
import { SocketConnectionManager } from '../../services/SocketConnectionManager';
import { ChatManager } from '../../../services/core/ChatManager';

describe('ConnectionSocketHandler', () => {
    let handler: ConnectionSocketHandler;
    let mockConnectionManager: jest.Mocked<SocketConnectionManager>;
    let mockSocket: jest.Mocked<Socket>;
    let mockIo: jest.Mocked<Server>;
    let mockChatManager: jest.Mocked<ChatManager>;
    const authenticatedUserId = 'user-123';

    beforeEach(() => {
        mockChatManager = {
            boostProviderDiscovery: jest.fn()
        } as unknown as jest.Mocked<ChatManager>;

        mockConnectionManager = {
            handleIdentify: jest.fn(),
            handleDisconnect: jest.fn(),
            getChatManager: jest.fn().mockReturnValue(mockChatManager)
        } as unknown as jest.Mocked<SocketConnectionManager>;

        mockSocket = {
            id: 'socket-123',
            on: jest.fn(),
            emit: jest.fn()
        } as unknown as jest.Mocked<Socket>;

        mockIo = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        } as unknown as jest.Mocked<Server>;

        handler = new ConnectionSocketHandler(mockConnectionManager);
    });

    describe('setupHandler', () => {
        it('debe llamar handleIdentify al conectar', async () => {
            await handler.setupHandler(mockSocket, mockIo, authenticatedUserId);

            expect(mockConnectionManager.handleIdentify).toHaveBeenCalledWith(
                authenticatedUserId,
                mockSocket
            );
        });

        it('debe registrar el evento identify', async () => {
            await handler.setupHandler(mockSocket, mockIo, authenticatedUserId);

            expect(mockSocket.on).toHaveBeenCalledWith('identify', expect.any(Function));
        });

        it('debe registrar el evento youtube_boost_discovery', async () => {
            await handler.setupHandler(mockSocket, mockIo, authenticatedUserId);

            expect(mockSocket.on).toHaveBeenCalledWith('youtube_boost_discovery', expect.any(Function));
        });

        it('debe registrar el evento tiktok_boost_discovery', async () => {
            await handler.setupHandler(mockSocket, mockIo, authenticatedUserId);

            expect(mockSocket.on).toHaveBeenCalledWith('tiktok_boost_discovery', expect.any(Function));
        });

        it('debe registrar el evento disconnect', async () => {
            await handler.setupHandler(mockSocket, mockIo, authenticatedUserId);

            expect(mockSocket.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
        });
    });
});
