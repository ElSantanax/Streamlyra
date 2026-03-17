import { Socket } from 'socket.io';
import { SocketConnectionManager } from '../SocketConnectionManager';
import { ChatManager } from '../../../services/core/ChatManager';

describe('SocketConnectionManager', () => {
    let manager: SocketConnectionManager;
    let mockChatManager: jest.Mocked<ChatManager>;
    let mockSocket: jest.Mocked<Socket>;

    beforeEach(() => {
        jest.useFakeTimers();
        mockChatManager = {
            connectUser: jest.fn().mockResolvedValue(undefined),
            disconnectUser: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<ChatManager>;

        mockSocket = {
            id: 'socket-123',
            emit: jest.fn(),
            join: jest.fn()
        } as unknown as jest.Mocked<Socket>;


        manager = new SocketConnectionManager(mockChatManager);
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    describe('handleIdentify', () => {
        it('debe identificar usuario válido correctamente', async () => {
            const userId = '550e8400-e29b-41d4-a716-446655440000';

            await manager.handleIdentify(userId, mockSocket);

            expect(mockSocket.join).toHaveBeenCalledWith(userId);
            expect(mockChatManager.connectUser).toHaveBeenCalledWith(userId);
            expect(mockSocket.emit).toHaveBeenCalledWith('identified', expect.any(Object));
        });

        it('no debe identificar userId inválido', async () => {
            await manager.handleIdentify('invalid-id', mockSocket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
                code: 'INVALID_USER_ID'
            }));
            expect(mockChatManager.connectUser).not.toHaveBeenCalled();
        });

        it('no debe identificar userId null', async () => {
            await manager.handleIdentify(null, mockSocket);

            expect(mockSocket.emit).toHaveBeenCalledWith('error', expect.objectContaining({
                code: 'INVALID_USER_ID'
            }));
        });
    });

    describe('handleDisconnect', () => {
        it('debe diferir la desconexión del usuario debido al periodo de gracia', async () => {
            const userId = '550e8400-e29b-41d4-a716-446655440000';
            await manager.handleIdentify(userId, mockSocket);

            await manager.handleDisconnect(mockSocket.id);

            // No debe desconectar inmediatamente
            expect(mockChatManager.disconnectUser).not.toHaveBeenCalled();

            // Avanzar el tiempo 60 segundos
            jest.advanceTimersByTime(60000);

            // Ahora sí debe haber intentado desconectar (es asíncrono dentro del timeout)
            // Usamos Promise.resolve() para dejar que las promesas pendientes se ejecuten
            await Promise.resolve();
            expect(mockChatManager.disconnectUser).toHaveBeenCalledWith(userId);
        });

        it('debe cancelar la desconexión si el usuario reconecta durante el periodo de gracia', async () => {
            const userId = '550e8400-e29b-41d4-a716-446655440000';
            await manager.handleIdentify(userId, mockSocket);

            await manager.handleDisconnect(mockSocket.id);

            // El usuario vuelve con un nuevo socket antes del minuto
            const newSocket = { ...mockSocket, id: 'socket-456' } as unknown as Socket;
            await manager.handleIdentify(userId, newSocket);

            // Avanzar el tiempo
            jest.advanceTimersByTime(60000);
            await Promise.resolve();

            // NO debe desconectar porque volvió a tiempo
            expect(mockChatManager.disconnectUser).not.toHaveBeenCalled();
        });
    });

    describe('getChatManager', () => {
        it('debe retornar la instancia de ChatManager', () => {
            expect(manager.getChatManager()).toBe(mockChatManager);
        });
    });
});
