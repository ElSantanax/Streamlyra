import { Server, Socket } from 'socket.io';
import { setupSocketHandlers } from '../socket.handler';
import { ChatManager } from '../../services/core/ChatManager';
import { MessageSenderService } from '../../services/message/MessageSenderService';
import { ConnectionService } from '../../services/connection/ConnectionService';
import { YouTubeService } from '../../services/platforms/YouTubeService';
import { UserService } from '../../services/user/UserService';

jest.mock('../middleware/SocketAuthMiddleware', () => ({
    createAuthMiddleware: jest.fn(() => jest.fn((_socket, next) => next()))
}));

type MockedFunction<T extends (...args: never[]) => unknown> = jest.MockedFunction<T>;

function getMockCall<T extends (...args: never[]) => unknown>(
    mockFn: MockedFunction<T>,
    callIndex: number,
    argIndex: number
): unknown {
    return mockFn.mock.calls[callIndex]?.[argIndex];
}

describe('Socket Handler', () => {
    let mockIo: jest.Mocked<Server>;
    let mockChatManager: jest.Mocked<ChatManager>;
    let mockMessageSenderService: jest.Mocked<MessageSenderService>;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockYouTubeService: jest.Mocked<YouTubeService>;
    let mockUserService: jest.Mocked<UserService>;

    beforeEach(() => {
        mockIo = {
            use: jest.fn(),
            on: jest.fn()
        } as unknown as jest.Mocked<Server>;

        mockChatManager = {} as jest.Mocked<ChatManager>;
        mockMessageSenderService = {} as jest.Mocked<MessageSenderService>;
        mockConnectionService = {} as jest.Mocked<ConnectionService>;
        mockYouTubeService = {} as jest.Mocked<YouTubeService>;
        mockUserService = {} as jest.Mocked<UserService>;
    });

    it('debe configurar el middleware de autenticación', () => {
        setupSocketHandlers(
            mockIo,
            mockChatManager,
            mockMessageSenderService,
            mockConnectionService,
            mockYouTubeService,
            mockUserService
        );

        expect(mockIo.use).toHaveBeenCalled();
    });

    it('debe registrar el evento connection', () => {
        setupSocketHandlers(
            mockIo,
            mockChatManager,
            mockMessageSenderService,
            mockConnectionService,
            mockYouTubeService,
            mockUserService
        );

        expect(mockIo.on).toHaveBeenCalledWith('connection', expect.any(Function));
    });

    it('debe desconectar socket sin userId autenticado', async () => {
        const mockSocket = {
            data: {},
            disconnect: jest.fn()
        } as unknown as jest.Mocked<Socket>;

        setupSocketHandlers(
            mockIo,
            mockChatManager,
            mockMessageSenderService,
            mockConnectionService,
            mockYouTubeService,
            mockUserService
        );

        const connectionHandler = getMockCall(mockIo.on as MockedFunction<typeof mockIo.on>, 0, 1) as (socket: Socket) => Promise<void>;
        await connectionHandler(mockSocket);

        expect(mockSocket.disconnect).toHaveBeenCalled();
    });
});
