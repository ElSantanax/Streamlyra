import { renderHook } from '@testing-library/react';
import { useSocket } from '../useSocket';
import { socket } from '../../services/socket';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useConnectionsStore } from '../../store/useConnectionsStore';

vi.mock('../../services/socket', () => {
    const mSocket = {
        connected: false,
        connect: vi.fn().mockImplementation(function (this: { connected: boolean }) { this.connected = true; }),
        disconnect: vi.fn().mockImplementation(function (this: { connected: boolean }) { this.connected = false; }),
        on: vi.fn(),
        off: vi.fn(),
        emit: vi.fn(),
    };
    return { socket: mSocket };
});

vi.mock('../../store/useConnectionsStore', () => ({
    useConnectionsStore: Object.assign(vi.fn(), {
        getState: vi.fn()
    })
}));

describe('useSocket', () => {
    const createMockState = (connected = true) => ({
        connectionsStatus: {
            twitch: { connected, isLive: false }
        },
        connectionHash: `twitch:${connected}:false`,
        getConnectedPlatforms: () => (connected ? ['twitch'] : [])
    });

    beforeEach(() => {
        vi.clearAllMocks();
        socket.connected = false;
        vi.spyOn(console, 'error').mockImplementation(() => { });
        vi.spyOn(console, 'warn').mockImplementation(() => { });

        // Mock de Zustand que soporta selectores
        vi.mocked(useConnectionsStore).mockImplementation(((selector?: unknown) => {
            const state = createMockState(true);
            return typeof selector === 'function' ? selector(state) : state;
        }) as unknown as typeof useConnectionsStore);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('debería inicializar con el estado de conexión del socket', () => {
        vi.mocked(useConnectionsStore).mockImplementation(((selector?: unknown) => {
            const state = createMockState(false);
            return typeof selector === 'function' ? selector(state) : state;
        }) as unknown as typeof useConnectionsStore);

        const { result } = renderHook(() => useSocket({ userId: '123' }));
        expect(result.current.isConnected).toBe(false);
    });

    it('debería conectar el socket si hay userId y plataformas activas', () => {
        renderHook(() => useSocket({ userId: '123' }));
        expect(socket.connect).toHaveBeenCalled();
    });

    it('no debería conectar el socket si no hay plataformas activas', () => {
        vi.mocked(useConnectionsStore).mockImplementation(((selector?: unknown) => {
            const state = createMockState(false);
            return typeof selector === 'function' ? selector(state) : state;
        }) as unknown as typeof useConnectionsStore);

        renderHook(() => useSocket({ userId: '123' }));
        expect(socket.connect).not.toHaveBeenCalled();
    });

    it('debería desconectar el socket si userId desaparece', () => {
        socket.connected = true;
        const { rerender } = renderHook(({ userId }) => useSocket({ userId }), {
            initialProps: { userId: '123' as string | undefined }
        });

        rerender({ userId: undefined });
        expect(socket.disconnect).toHaveBeenCalled();
    });

    it('debería emitir identify cuando el socket se conecta', () => {
        renderHook(() => useSocket({ userId: '123' }));

        // Simular evento de conexión
        const handleConnect = vi.mocked(socket.on).mock.calls.find(call => call[0] === 'connect')?.[1] as () => void;
        expect(handleConnect).toBeDefined();

        if (handleConnect) {
            handleConnect();
        }

        expect(socket.emit).toHaveBeenCalledWith('identify', '123');
    });
});
