/**
 * Test para verificar que el fix de race condition funciona correctamente
 * 
 * Este test verifica que:
 * 1. Múltiples sockets simultáneos NO crean conexiones duplicadas
 * 2. El lock previene race conditions
 * 3. Los sockets posteriores reutilizan la conexión existente
 * 4. El sistema maneja correctamente múltiples dispositivos/navegadores
 */

import { SocketConnectionManager } from '../SocketConnectionManager';
import { ChatManager } from '../../services/ChatManager';
import { Socket, Server } from 'socket.io';
import { Connection } from '../../models/Connection.model';

// Mock Connection model
jest.mock('../../models/Connection.model');

interface SocketConnectionManagerTestAccess {
    registry: {
        userSocketCount: Map<string, number>;
    };
    lockManager: {
        connectingLocks: Map<string, Promise<void>>;
    };
}

describe('SocketConnectionManager - Race Condition Fix', () => {
    let manager: SocketConnectionManager;
    let mockChatManager: jest.Mocked<ChatManager>;
    let mockSocket1: jest.Mocked<Socket>;
    let mockSocket2: jest.Mocked<Socket>;
    let mockSocket3: jest.Mocked<Socket>;
    let mockIo: jest.Mocked<Server>;
    let connectUserCallCount: number;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.clearAllTimers();
        connectUserCallCount = 0;

        // Mock Connection actions
        (Connection.findAll as jest.Mock).mockResolvedValue([]);

        // Mock ChatManager
        mockChatManager = {
            connectUser: jest.fn().mockImplementation(async () => {
                connectUserCallCount++;
                // Simular delay de conexión (2 segundos)
                await new Promise(resolve => setTimeout(resolve, 2000));
            }),
            disconnectUser: jest.fn().mockResolvedValue(undefined)
        } as unknown as jest.Mocked<ChatManager>;

        // Mock Socket.IO Server
        mockIo = {} as jest.Mocked<Server>;

        // Mock Sockets
        mockSocket1 = {
            id: 'socket-1',
            join: jest.fn(),
            emit: jest.fn()
        } as unknown as jest.Mocked<Socket>;

        mockSocket2 = {
            id: 'socket-2',
            join: jest.fn(),
            emit: jest.fn()
        } as unknown as jest.Mocked<Socket>;

        mockSocket3 = {
            id: 'socket-3',
            join: jest.fn(),
            emit: jest.fn()
        } as unknown as jest.Mocked<Socket>;

        manager = new SocketConnectionManager(mockChatManager);
    });

    afterEach(() => {
        jest.clearAllTimers();
        jest.useRealTimers();
    });

    test('debe prevenir conexiones duplicadas cuando 2 sockets se identifican simultáneamente', async () => {
        jest.useFakeTimers();

        const userId = '550e8400-e29b-41d4-a716-446655440001';

        // Simular 2 sockets identificándose al mismo tiempo
        const promise1 = manager.handleIdentify(userId, mockSocket1, mockIo);
        const promise2 = manager.handleIdentify(userId, mockSocket2, mockIo);

        // Avanzar timers para que se completen las conexiones
        jest.advanceTimersByTime(3000);

        await Promise.all([promise1, promise2]);

        // Verificar que connectUser solo se llamó UNA vez
        expect(connectUserCallCount).toBe(1);
        expect(mockChatManager.connectUser).toHaveBeenCalledTimes(1);
        expect(mockChatManager.connectUser).toHaveBeenCalledWith(userId);

        // Verificar que ambos sockets fueron unidos a la sala
        expect(mockSocket1.join).toHaveBeenCalledWith(userId);
        expect(mockSocket2.join).toHaveBeenCalledWith(userId);

        // Verificar que ambos sockets recibieron confirmación
        expect(mockSocket1.emit).toHaveBeenCalledWith('identified', {
            userId,
            message: 'Conectado a plataformas'
        });
        expect(mockSocket2.emit).toHaveBeenCalledWith('identified', {
            userId,
            message: 'Conectado a plataformas'
        });
    });

    test('debe manejar 3 sockets simultáneos (múltiples dispositivos)', async () => {
        jest.useFakeTimers();

        const userId = '550e8400-e29b-41d4-a716-446655440002';

        // Simular 3 dispositivos conectándose al mismo tiempo
        const promise1 = manager.handleIdentify(userId, mockSocket1, mockIo);
        const promise2 = manager.handleIdentify(userId, mockSocket2, mockIo);
        const promise3 = manager.handleIdentify(userId, mockSocket3, mockIo);

        jest.advanceTimersByTime(3000);

        await Promise.all([promise1, promise2, promise3]);

        // Verificar que connectUser solo se llamó UNA vez
        expect(connectUserCallCount).toBe(1);
        expect(mockChatManager.connectUser).toHaveBeenCalledTimes(1);

        // Verificar que los 3 sockets fueron unidos
        expect(mockSocket1.join).toHaveBeenCalledWith(userId);
        expect(mockSocket2.join).toHaveBeenCalledWith(userId);
        expect(mockSocket3.join).toHaveBeenCalledWith(userId);

        // Verificar que los 3 sockets recibieron confirmación
        expect(mockSocket1.emit).toHaveBeenCalledWith('identified', expect.any(Object));
        expect(mockSocket2.emit).toHaveBeenCalledWith('identified', expect.any(Object));
        expect(mockSocket3.emit).toHaveBeenCalledWith('identified', expect.any(Object));
    });

    test('debe permitir que el segundo socket reutilice la conexión existente', async () => {
        jest.useFakeTimers();

        const userId = '550e8400-e29b-41d4-a716-446655440003';

        // Primer socket se identifica
        const promise1 = manager.handleIdentify(userId, mockSocket1, mockIo);

        // Avanzar 1 segundo (conexión aún en progreso)
        jest.advanceTimersByTime(1000);

        // Segundo socket se identifica mientras el primero aún está conectando
        const promise2 = manager.handleIdentify(userId, mockSocket2, mockIo);

        // Avanzar el resto del tiempo
        jest.advanceTimersByTime(2000);

        await Promise.all([promise1, promise2]);

        // Verificar que connectUser solo se llamó UNA vez
        expect(connectUserCallCount).toBe(1);
        expect(mockChatManager.connectUser).toHaveBeenCalledTimes(1);

        // Ambos sockets deben estar conectados
        expect(mockSocket1.emit).toHaveBeenCalledWith('identified', expect.any(Object));
        expect(mockSocket2.emit).toHaveBeenCalledWith('identified', expect.any(Object));
    });

    test('debe limpiar el lock después de una conexión exitosa', async () => {
        jest.useFakeTimers();

        const userId = '550e8400-e29b-41d4-a716-446655440004';

        // Primera conexión
        const promise1 = manager.handleIdentify(userId, mockSocket1, mockIo);
        jest.advanceTimersByTime(3000);
        await promise1;

        // Verificar que el lock fue removido
        const locks = (manager as unknown as SocketConnectionManagerTestAccess).lockManager.connectingLocks;
        expect(locks.has(userId)).toBe(false);

        // Desconectar el socket
        await manager.handleDisconnect(mockSocket1.id);

        // Segunda conexión (nuevo usuario conectándose)
        const promise2 = manager.handleIdentify(userId, mockSocket2, mockIo);
        jest.advanceTimersByTime(3000);
        await promise2;

        // Verificar que connectUser se llamó 2 veces (una por cada sesión)
        expect(connectUserCallCount).toBe(2);
    });

    test('debe limpiar el lock en caso de error', async () => {
        jest.useFakeTimers();

        const userId = '550e8400-e29b-41d4-a716-446655440005';

        // Mock para que falle la conexión
        mockChatManager.connectUser.mockRejectedValueOnce(new Error('Connection failed'));

        // Intentar conectar
        const promise = manager.handleIdentify(userId, mockSocket1, mockIo);
        jest.advanceTimersByTime(3000);

        await promise;

        // Verificar que el lock fue removido incluso con error
        const locks = (manager as unknown as SocketConnectionManagerTestAccess).lockManager.connectingLocks;
        expect(locks.has(userId)).toBe(false);

        // Verificar que se emitió un error
        expect(mockSocket1.emit).toHaveBeenCalledWith('error', expect.objectContaining({
            code: 'CONNECTION_ERROR'
        }));
    });

    test('debe manejar timeout y limpiar el lock', async () => {
        jest.useFakeTimers();

        const userId = '550e8400-e29b-41d4-a716-446655440006';

        // Mock para que la conexión tarde más de 30 segundos
        mockChatManager.connectUser.mockImplementation(async () => {
            await new Promise(resolve => setTimeout(resolve, 35000));
        });

        // Intentar conectar
        const promise = manager.handleIdentify(userId, mockSocket1, mockIo);

        // Avanzar 31 segundos (más que el timeout de 30s)
        jest.advanceTimersByTime(31000);

        await promise;

        // Verificar que el lock fue removido
        const locks = (manager as unknown as SocketConnectionManagerTestAccess).lockManager.connectingLocks;
        expect(locks.has(userId)).toBe(false);

        // Verificar que se emitió un error de timeout
        expect(mockSocket1.emit).toHaveBeenCalledWith('error', expect.objectContaining({
            code: 'CONNECTION_TIMEOUT'
        }));
    });

    test('debe manejar desconexión mientras hay una conexión en progreso', async () => {
        jest.useFakeTimers();

        const userId = '550e8400-e29b-41d4-a716-446655440007';

        // Iniciar conexión
        const promise = manager.handleIdentify(userId, mockSocket1, mockIo);

        // Avanzar 1 segundo (conexión en progreso)
        jest.advanceTimersByTime(1000);

        // Desconectar mientras está conectando
        const disconnectPromise = manager.handleDisconnect(mockSocket1.id);

        // Avanzar el resto del tiempo
        jest.advanceTimersByTime(3000);

        await Promise.all([promise, disconnectPromise]);

        // Verificar que se intentó desconectar
        expect(mockChatManager.disconnectUser).toHaveBeenCalledWith(userId);
    });

    test('debe manejar múltiples usuarios diferentes simultáneamente', async () => {
        jest.useFakeTimers();

        const user1 = '550e8400-e29b-41d4-a716-446655440008';
        const user2 = '550e8400-e29b-41d4-a716-446655440009';

        // Dos usuarios diferentes conectándose al mismo tiempo
        const promise1 = manager.handleIdentify(user1, mockSocket1, mockIo);
        const promise2 = manager.handleIdentify(user2, mockSocket2, mockIo);

        jest.advanceTimersByTime(3000);

        await Promise.all([promise1, promise2]);

        // Verificar que connectUser se llamó 2 veces (una por cada usuario)
        expect(connectUserCallCount).toBe(2);
        expect(mockChatManager.connectUser).toHaveBeenCalledWith(user1);
        expect(mockChatManager.connectUser).toHaveBeenCalledWith(user2);
    });

    test('debe rechazar userId inválido sin crear lock', async () => {
        const invalidUserId = 'user@invalid!';

        await manager.handleIdentify(invalidUserId, mockSocket1, mockIo);

        // Verificar que no se creó lock
        const locks = (manager as unknown as SocketConnectionManagerTestAccess).lockManager.connectingLocks;
        expect(locks.size).toBe(0);

        // Verificar que no se intentó conectar
        expect(mockChatManager.connectUser).not.toHaveBeenCalled();

        // Verificar que se emitió error
        expect(mockSocket1.emit).toHaveBeenCalledWith('error', expect.objectContaining({
            code: 'INVALID_USER_ID'
        }));
    });

    test('debe mantener contador de sockets correcto con múltiples conexiones', async () => {
        jest.useFakeTimers();

        const userId = '550e8400-e29b-41d4-a716-446655440010';

        // Conectar primer socket
        const promise1 = manager.handleIdentify(userId, mockSocket1, mockIo);
        jest.advanceTimersByTime(3000);
        await promise1;

        // Conectar segundo socket
        const promise2 = manager.handleIdentify(userId, mockSocket2, mockIo);
        jest.advanceTimersByTime(100);
        await promise2;

        // Conectar tercer socket
        const promise3 = manager.handleIdentify(userId, mockSocket3, mockIo);
        jest.advanceTimersByTime(100);
        await promise3;

        // Verificar contador
        const socketCount = (manager as unknown as SocketConnectionManagerTestAccess).registry.userSocketCount.get(userId);
        expect(socketCount).toBe(3);

        // Desconectar 1 socket
        await manager.handleDisconnect(mockSocket1.id);
        const count1 = (manager as unknown as SocketConnectionManagerTestAccess).registry.userSocketCount.get(userId);
        expect(count1).toBe(2);

        // Desconectar otro socket
        await manager.handleDisconnect(mockSocket2.id);
        const count2 = (manager as unknown as SocketConnectionManagerTestAccess).registry.userSocketCount.get(userId);
        expect(count2).toBe(1);

        // Desconectar último socket
        await manager.handleDisconnect(mockSocket3.id);
        const hasCount = (manager as unknown as SocketConnectionManagerTestAccess).registry.userSocketCount.has(userId);
        expect(hasCount).toBe(false);

        // Verificar que disconnectUser solo se llamó una vez (al último socket)
        expect(mockChatManager.disconnectUser).toHaveBeenCalledTimes(1);
    }, 10000); // Aumentar timeout a 10 segundos
});
