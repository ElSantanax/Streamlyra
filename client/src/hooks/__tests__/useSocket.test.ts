import { renderHook } from '@testing-library/react';
import { useSocket } from '../useSocket';
import { socket } from '../../services/socket';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ConnectionStatus, ChatMessage } from '../../types';

vi.mock('../../services/socket', () => {
  const mSocket = {
    connected: false,
    connect: vi.fn().mockImplementation(function(this: { connected: boolean }) { this.connected = true; }),
    disconnect: vi.fn().mockImplementation(function(this: { connected: boolean }) { this.connected = false; }),
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
  };
  return { socket: mSocket };
});

describe('useSocket', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        socket.connected = false;
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.spyOn(console, 'warn').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('debería inicializar con el estado de conexión del socket', () => {
        const { result } = renderHook(() => useSocket({ userId: '123' }));
        expect(result.current.isConnected).toBe(false);
    });

    it('debería conectar el socket si hay userId y plataformas activas', () => {
        const connections: Record<string, ConnectionStatus> = { twitch: { connected: true } };
        renderHook(() => useSocket({ userId: '123', connections, connectionHash: 'hash1' }));
        
        expect(socket.connect).toHaveBeenCalled();
    });

    it('no debería conectar el socket si no hay plataformas activas', () => {
        const connections: Record<string, ConnectionStatus> = { twitch: { connected: false } };
        renderHook(() => useSocket({ userId: '123', connections, connectionHash: 'hash1' }));
        
        expect(socket.connect).not.toHaveBeenCalled();
    });

    it('debería desconectar el socket si userId desaparece', () => {
        socket.connected = true;
        const connections: Record<string, ConnectionStatus> = { twitch: { connected: true } };
        const { rerender } = renderHook(({ userId }) => useSocket({ userId, connections, connectionHash: 'h' }), {
            initialProps: { userId: '123' as string | undefined }
        });

        rerender({ userId: undefined });
        expect(socket.disconnect).toHaveBeenCalled();
    });

    it('debería emitir identify cuando el socket se conecta', () => {
        renderHook(() => useSocket({ userId: '123', connections: { t: { connected: true } } }));

        // Simular evento de conexión
        const handleConnect = vi.mocked(socket.on).mock.calls.find(call => call[0] === 'connect')?.[1] as () => void;
        expect(handleConnect).toBeDefined();

        if (handleConnect) {
            handleConnect();
        }

        expect(socket.emit).toHaveBeenCalledWith('identify', '123');
    });

    it('debería manejar mensajes de chat recibidos', () => {
        const onChatMessage = vi.fn();
        renderHook(() => useSocket({ 
            userId: '123', 
            onChatMessage,
            connections: { twitch: { connected: true } }
        }));

        const handleChatMessage = vi.mocked(socket.on).mock.calls.find(call => call[0] === 'chat_message')?.[1] as (msg: ChatMessage) => void;
        expect(handleChatMessage).toBeDefined();

        const mockMsg: ChatMessage = { platform: 'twitch', message: 'hola', id: '1', time: new Date().toISOString(), user: 'testuser' };
        if (handleChatMessage) {
            handleChatMessage(mockMsg);
        }

        expect(onChatMessage).toHaveBeenCalledWith(mockMsg);
    });

    it('debería ignorar mensajes de plataformas no conectadas', () => {
        const onChatMessage = vi.fn();
        renderHook(() => useSocket({ 
            userId: '123', 
            onChatMessage,
            connections: { twitch: { connected: false } }
        }));

        const handleChatMessage = vi.mocked(socket.on).mock.calls.find(call => call[0] === 'chat_message')?.[1] as (msg: ChatMessage) => void;
        const mockMsg: ChatMessage = { platform: 'twitch', message: 'hola', id: '1', time: new Date().toISOString(), user: 'testuser' };
        
        if (handleChatMessage) {
            handleChatMessage(mockMsg);
        }

        expect(onChatMessage).not.toHaveBeenCalled();
        expect(console.warn).toHaveBeenCalled();
    });

    it('debería manejar actualizaciones de estado de mensaje', () => {
        const onMessageStatusUpdate = vi.fn();
        renderHook(() => useSocket({ userId: '123', onMessageStatusUpdate }));

        const handleStatus = vi.mocked(socket.on).mock.calls.find(call => call[0] === 'message_status_update')?.[1] as (data: { messageId: string; status: 'sending' | 'sent' | 'error' }) => void;
        const statusData = { messageId: 'm1', status: 'sent' as const };
        
        if (handleStatus) {
            handleStatus(statusData);
        }

        expect(onMessageStatusUpdate).toHaveBeenCalledWith('m1', 'sent', undefined, undefined);
    });
});
