import { renderHook, act } from '@testing-library/react';
import { useConnections } from '../index';
import { authService } from '../../../services/api/auth.service';
import { socket } from '../../../services/socket';
import { useConnectionsApi } from '../useConnectionsApi';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invalidateConnectionsCache } from '../cache';

vi.mock('../../../services/api/auth.service', () => ({
    authService: {
        disconnectPlatform: vi.fn(),
        getMe: vi.fn()
    }
}));

vi.mock('../../../services/socket', () => ({
    socket: {
        emit: vi.fn(),
        on: vi.fn(),
        off: vi.fn()
    }
}));

vi.mock('../useConnectionsApi', () => ({
    useConnectionsApi: vi.fn().mockReturnValue({ fetchConnections: vi.fn() })
}));

vi.mock('../useConnectionsSocket', () => ({
    useConnectionsSocket: vi.fn()
}));

describe('useConnections', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        invalidateConnectionsCache();
    });

    it('debería inicializar con estados iniciales', () => {
        const { result } = renderHook(() => useConnections(false));

        expect(result.current.connectionsStatus.twitch.connected).toBe(false);
        expect(result.current.isLoading).toBe(false);
    });

    it('debería llamar a fetchConnections si shouldFetch es true', () => {
        const mockFetch = vi.fn();
        vi.mocked(useConnectionsApi).mockReturnValue({ fetchConnections: mockFetch });

        renderHook(() => useConnections(true));

        expect(mockFetch).toHaveBeenCalled();
    });

    it('debería permitir desconectar una plataforma', async () => {
        vi.mocked(authService.disconnectPlatform).mockResolvedValue(undefined);
        const { result } = renderHook(() => useConnections(false));

        await act(async () => {
            await result.current.disconnectPlatform('twitch');
        });

        expect(authService.disconnectPlatform).toHaveBeenCalledWith('twitch');
        expect(result.current.connectionsStatus.twitch.connected).toBe(false);
    });

    it('debería emitir boosts para youtube o tiktok', () => {
        const { result } = renderHook(() => useConnections(false));

        act(() => {
            result.current.searchStream('youtube');
        });

        expect(socket.emit).toHaveBeenCalledWith('youtube_boost_discovery');
    });
});
