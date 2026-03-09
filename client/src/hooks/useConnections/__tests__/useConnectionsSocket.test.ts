import { renderHook } from '@testing-library/react';
import { useConnectionsSocket } from '../useConnectionsSocket';
import { socket } from '../../../services/socket';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { ConnectionStatusUpdate, ViewersUpdate, ConnectionStatus } from '../../../types';

vi.mock('../../../services/socket', () => ({
    socket: {
        on: vi.fn(),
        off: vi.fn()
    }
}));

describe('useConnectionsSocket', () => {
    const mockUpdateStatus = vi.fn();
    const mockUpdateStats = vi.fn();
    const mockSetLastFollower = vi.fn();
    const mockSetLastRaid = vi.fn();
    const mockStatusRef = { current: { twitch: { connected: true, isLive: false } } } as unknown as React.MutableRefObject<Record<string, ConnectionStatus>>;

    const defaultProps = {
        statusRef: mockStatusRef,
        updateStatus: mockUpdateStatus,
        updateStats: mockUpdateStats,
        setLastFollower: mockSetLastFollower,
        setLastRaid: mockSetLastRaid
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('debería suscribirse a eventos de socket al montar y desuscribirse al desmontar', () => {
        const { unmount } = renderHook(() => useConnectionsSocket(defaultProps));

        expect(socket.on).toHaveBeenCalledWith('connection_status', expect.any(Function));
        expect(socket.on).toHaveBeenCalledWith('viewers_update', expect.any(Function));

        unmount();

        expect(socket.off).toHaveBeenCalledWith('connection_status', expect.any(Function));
        expect(socket.off).toHaveBeenCalledWith('viewers_update', expect.any(Function));
    });

    it('debería procesar actualizaciones de estado de conexión', () => {
        renderHook(() => useConnectionsSocket(defaultProps));
        
        const handler = vi.mocked(socket.on).mock.calls.find(call => call[0] === 'connection_status')?.[1] as (d: ConnectionStatusUpdate) => void;
        
        const update: ConnectionStatusUpdate = {
            platform: 'twitch',
            status: 'connected',
            isLive: true,
            serverTime: '2023-01-01',
            sessionStartTime: '2023-01-01'
        };

        handler(update);

        expect(mockUpdateStatus).toHaveBeenCalledWith('twitch', expect.objectContaining({
            connected: true,
            status: 'connected',
            isLive: true
        }));
        expect(mockUpdateStats).toHaveBeenCalledWith('twitch', expect.objectContaining({
            serverTime: '2023-01-01'
        }));
    });

    it('debería procesar actualizaciones de espectadores', () => {
        renderHook(() => useConnectionsSocket(defaultProps));
        
        const handler = vi.mocked(socket.on).mock.calls.find(call => call[0] === 'viewers_update')?.[1] as (d: ViewersUpdate) => void;
        
        const update: ViewersUpdate = {
            platform: 'twitch',
            count: 100,
            isLive: true,
            serverTime: '2023-01-01'
        };

        handler(update);

        expect(mockUpdateStats).toHaveBeenCalledWith('twitch', expect.objectContaining({
            viewers: 100
        }));
    });
});
