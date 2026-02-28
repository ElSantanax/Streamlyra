import { Server, Socket } from 'socket.io';
import { SocketConnectionManager } from '../SocketConnectionManager';
import { ChatManager } from '../../../services/core/ChatManager';

describe('SocketConnectionManager', () => {
    let manager: SocketConnectionManager;
    let mockChatManager: jest.Mocked<ChatManager>;
    let mockSocket: jest.Mocked<Socket>;
    let mockIo: jest.Mocked<Server>;

    beforeEach(() => {
        mockChatManager = {
            connectUser: jest.fn().mockResolvedValue(undefined),
            disconnectUser: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<ChatManager>;

        mockSocket = {
            id: 'socket-123',
            emit: jest.fn(),
            join: jest.fn()
        } as unknown as jest.Mocked<Socket>;

        mockIo = {} as jest.Mocked<Server>;

        manager = new SocketConnectionManager(mockChatManager);
    });

    describe('handleIdentify', () => {
        it('debe identificar usuario válido correctamente', async () => {
            const userId = '550e8400-e29b-41d4-a716-446655440000';

            await manager.handleIdentify(userId, mockSocket, mockIo);

            expect(mockSocket.join).toHaveBeenCalledWith(userId);
            expect(mockChatManager.connectUser).toHaveBeenCalledWith(userId);
            expect(mockSocket.emit).toHaveBeenCalledWith('identified', expect.any(Object));
        });

        it('no debe identificar userId inválido', async () => {
            await manager.handleIdentify('invalid-id', mockSocket, mockIo);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
                code: 'INVALID_USER_ID'
            }));
            expect(mockChatManager.connectUser).not.toHaveBeenCalled();
        });

        it('no debe identificar userId null', async () => {
            await manager.handleIdentify(null, mockSocket, mockIo);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
                code: 'INVALID_USER_ID'
            }));
        });
    });

    describe('handleDisconnect', () => {
        it('debe desconectar usuario cuando es el último socket', async () => {
            const userId = '550e8400-e29b-41d4-a716-446655440000';
            await manager.handleIdentify(userId, mockSocket, mockIo);

            await manager.handleDisconnect(mockSocket.id);

            expect(mockChatManager.disconnectUser).toHaveBeenCalledWith(userId);
        });
    });

    describe('getChatManager', () => {
        it('debe retornar la instancia de ChatManager', () => {
            expect(manager.getChatManager()).toBe(mockChatManager);
        });
    });
});
