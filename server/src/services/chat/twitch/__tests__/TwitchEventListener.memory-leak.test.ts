/**
 * Test para verificar que el fix de memory leak en TwitchEventListener funciona correctamente
 * 
 * Este test verifica que:
 * 1. Los listeners se agregan correctamente
 * 2. Los listeners se remueven al desconectar
 * 3. No hay listeners duplicados al reconectar
 * 4. No hay memory leaks
 */

import { TwitchEventListener } from '../TwitchEventListener';
import { TwitchEventTransformer } from '../../transformers/TwitchEventTransformer';
import { Server } from 'socket.io';
import tmi from 'tmi.js';
import { EventEmitter } from 'events';

// Mock de tmi.Client que extiende EventEmitter
class MockTmiClient extends EventEmitter {
    connect = jest.fn().mockResolvedValue(undefined);
    disconnect = jest.fn().mockResolvedValue(undefined);
    join = jest.fn().mockResolvedValue(undefined);
}

describe('TwitchEventListener - Memory Leak Fix', () => {
    let listener: TwitchEventListener;
    let mockTransformer: jest.Mocked<TwitchEventTransformer>;
    let mockClient: MockTmiClient;
    let mockIo: jest.Mocked<Server>;
    let emittedMessages: Array<{ event: string; data: unknown }>;

    beforeEach(() => {
        emittedMessages = [];

        // Mock Transformer
        mockTransformer = {
            transformChatMessage: jest.fn().mockReturnValue({ type: 'message', message: 'test' }),
            transformSubscription: jest.fn().mockReturnValue({ type: 'subscription', message: 'sub' }),
            transformResub: jest.fn().mockReturnValue({ type: 'resub', message: 'resub' }),
            transformCheer: jest.fn().mockReturnValue({ type: 'cheer', message: 'cheer' })
        } as unknown as jest.Mocked<TwitchEventTransformer>;

        // Mock Socket.IO
        mockIo = {
            to: jest.fn().mockReturnValue({
                emit: jest.fn((event: string, data: unknown) => {
                    emittedMessages.push({ event, data });
                })
            })
        } as unknown as jest.Mocked<Server>;

        // Mock tmi.Client
        mockClient = new MockTmiClient();

        listener = new TwitchEventListener(mockTransformer);
    });

    afterEach(() => {
        mockClient.removeAllListeners();
    });

    test('debe agregar listeners correctamente', () => {
        const userId = 'user-123';

        listener.setupListeners(userId, mockClient as unknown as tmi.Client, mockIo);

        // Verificar que los listeners fueron agregados
        expect(mockClient.listenerCount('message')).toBe(1);
        expect(mockClient.listenerCount('subscription')).toBe(1);
        expect(mockClient.listenerCount('resub')).toBe(1);
        expect(mockClient.listenerCount('cheer')).toBe(1);
    });

    test('debe remover listeners correctamente', () => {
        const userId = 'user-456';

        // Agregar listeners
        listener.setupListeners(userId, mockClient as unknown as tmi.Client, mockIo);
        expect(mockClient.listenerCount('message')).toBe(1);

        // Remover listeners
        listener.removeListeners(userId, mockClient as unknown as tmi.Client);

        // Verificar que los listeners fueron removidos
        expect(mockClient.listenerCount('message')).toBe(0);
        expect(mockClient.listenerCount('subscription')).toBe(0);
        expect(mockClient.listenerCount('resub')).toBe(0);
        expect(mockClient.listenerCount('cheer')).toBe(0);
    });

    test('debe prevenir listeners duplicados al reconectar', () => {
        const userId = 'user-789';

        // Primera conexión
        listener.setupListeners(userId, mockClient as unknown as tmi.Client, mockIo);
        expect(mockClient.listenerCount('message')).toBe(1);

        // Simular reconexión (sin desconectar primero)
        listener.setupListeners(userId, mockClient as unknown as tmi.Client, mockIo);

        // Verificar que NO hay duplicados (setupListeners llama a removeListeners primero)
        expect(mockClient.listenerCount('message')).toBe(1);
        expect(mockClient.listenerCount('subscription')).toBe(1);
        expect(mockClient.listenerCount('resub')).toBe(1);
        expect(mockClient.listenerCount('cheer')).toBe(1);
    });

    test('debe emitir mensajes correctamente cuando llegan eventos', () => {
        const userId = 'user-emit';

        listener.setupListeners(userId, mockClient as unknown as tmi.Client, mockIo);

        // Simular evento de mensaje
        mockClient.emit('message', '#channel', { username: 'testuser' }, 'Hello!', false);

        // Verificar que se emitió el mensaje
        expect(emittedMessages.length).toBe(1);
        expect(emittedMessages[0].event).toBe('chat_message');
        expect(mockTransformer.transformChatMessage).toHaveBeenCalled();
    });

    test('NO debe emitir mensajes después de remover listeners', () => {
        const userId = 'user-no-emit';

        // Agregar listeners
        listener.setupListeners(userId, mockClient as unknown as tmi.Client, mockIo);

        // Remover listeners
        listener.removeListeners(userId, mockClient as unknown as tmi.Client);

        // Simular evento de mensaje
        mockClient.emit('message', '#channel', { username: 'testuser' }, 'Hello!', false);

        // Verificar que NO se emitió nada
        expect(emittedMessages.length).toBe(0);
        expect(mockTransformer.transformChatMessage).not.toHaveBeenCalled();
    });

    test('debe manejar múltiples usuarios independientemente', () => {
        const user1 = 'user-1';
        const user2 = 'user-2';

        const mockClient1 = new MockTmiClient();
        const mockClient2 = new MockTmiClient();

        // Agregar listeners para ambos usuarios
        listener.setupListeners(user1, mockClient1 as unknown as tmi.Client, mockIo);
        listener.setupListeners(user2, mockClient2 as unknown as tmi.Client, mockIo);

        expect(mockClient1.listenerCount('message')).toBe(1);
        expect(mockClient2.listenerCount('message')).toBe(1);

        // Remover listeners solo del user1
        listener.removeListeners(user1, mockClient1 as unknown as tmi.Client);

        // Verificar que solo user1 fue limpiado
        expect(mockClient1.listenerCount('message')).toBe(0);
        expect(mockClient2.listenerCount('message')).toBe(1);

        // Limpiar
        mockClient1.removeAllListeners();
        mockClient2.removeAllListeners();
    });

    test('debe manejar removeListeners cuando no hay listeners', () => {
        const userId = 'user-no-listeners';

        // Intentar remover listeners sin haberlos agregado
        expect(() => {
            listener.removeListeners(userId, mockClient as unknown as tmi.Client);
        }).not.toThrow();

        // Verificar que no hay listeners
        expect(mockClient.listenerCount('message')).toBe(0);
    });

    test('debe emitir todos los tipos de eventos correctamente', () => {
        const userId = 'user-all-events';

        listener.setupListeners(userId, mockClient as unknown as tmi.Client, mockIo);

        // Simular diferentes tipos de eventos
        mockClient.emit('message', '#channel', { username: 'user1' }, 'Hello!', false);
        mockClient.emit('subscription', '#channel', 'user2', 'Prime', 'Thanks!', {} as Record<string, unknown>);
        mockClient.emit('resub', '#channel', 'user3', 12, 'Still here!', {} as Record<string, unknown>, {} as Record<string, unknown>);
        mockClient.emit('cheer', '#channel', { username: 'user4', bits: '100' }, 'Cheers!');

        // Verificar que se emitieron 4 mensajes
        expect(emittedMessages.length).toBe(4);
        expect(mockTransformer.transformChatMessage).toHaveBeenCalledTimes(1);
        expect(mockTransformer.transformSubscription).toHaveBeenCalledTimes(1);
        expect(mockTransformer.transformResub).toHaveBeenCalledTimes(1);
        expect(mockTransformer.transformCheer).toHaveBeenCalledTimes(1);
    });

    test('debe prevenir memory leak en reconexiones múltiples', () => {
        const userId = 'user-multiple-reconnects';

        // Simular 5 reconexiones
        for (let i = 0; i < 5; i++) {
            listener.setupListeners(userId, mockClient as unknown as tmi.Client, mockIo);
        }

        // Verificar que solo hay 1 listener de cada tipo (no 5)
        expect(mockClient.listenerCount('message')).toBe(1);
        expect(mockClient.listenerCount('subscription')).toBe(1);
        expect(mockClient.listenerCount('resub')).toBe(1);
        expect(mockClient.listenerCount('cheer')).toBe(1);

        // Simular evento
        mockClient.emit('message', '#channel', { username: 'test' }, 'Test', false);

        // Verificar que el mensaje se emitió solo 1 vez (no 5)
        expect(emittedMessages.length).toBe(1);
    });

    test('debe limpiar referencias internas al remover listeners', () => {
        const userId = 'user-cleanup';

        // Agregar listeners
        listener.setupListeners(userId, mockClient as unknown as tmi.Client, mockIo);

        // Verificar que hay referencias internas
        interface ListenerTestAccess {
            listenerRefs: Map<string, unknown>;
        }
        const listenerRefs = (listener as unknown as ListenerTestAccess).listenerRefs;
        expect(listenerRefs.has(userId)).toBe(true);

        // Remover listeners
        listener.removeListeners(userId, mockClient as unknown as tmi.Client);

        // Verificar que las referencias fueron limpiadas
        expect(listenerRefs.has(userId)).toBe(false);
    });
});
