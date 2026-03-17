import { renderHook, act } from '@testing-library/react';
import { useConnections } from '../index';
import { useConnectionsStore } from '../../../store/useConnectionsStore';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { invalidateConnectionsCache } from '../cache';

vi.mock('../../../store/useConnectionsStore', () => {
    const mockState = {
        connectionsStatus: {
            twitch: { connected: false, status: 'disconnected', isLive: false },
            youtube: { connected: false, status: 'disconnected', isLive: false },
            tiktok: { connected: false, status: 'disconnected', isLive: false }
        },
        connectionsStats: {
            twitch: { viewers: 0 },
            youtube: { viewers: 0 },
            tiktok: { viewers: 0 }
        },
        lastFollower: null,
        lastRaid: null,
        isLoading: false,
        error: null,
        updateStatus: vi.fn(),
        updateStats: vi.fn(),
        fetchConnections: vi.fn(),
        disconnectPlatform: vi.fn(),
        searchStream: vi.fn(),
        reset: vi.fn()
    };
    return {
        useConnectionsStore: Object.assign(vi.fn(() => mockState), {
            getState: () => mockState,
            setState: vi.fn()
        })
    };
});

vi.mock('../useConnectionsSocket', () => ({
    useConnectionsSocket: vi.fn()
}));

describe('useConnections', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        invalidateConnectionsCache();
    });

    it('debería inicializar con estados iniciales del store', () => {
        const { result } = renderHook(() => useConnections(false));

        expect(result.current.connectionsStatus.twitch.connected).toBe(false);
        expect(result.current.isLoading).toBe(false);
    });

    it('debería llamar a fetchConnections si shouldFetch es true', () => {
        const mockStore = useConnectionsStore();
        renderHook(() => useConnections(true));
        expect(mockStore.fetchConnections).toHaveBeenCalled();
    });

    it('debería permitir llamar a disconnectPlatform del store', async () => {
        const mockStore = useConnectionsStore();
        const { result } = renderHook(() => useConnections(false));

        await act(async () => {
            await result.current.disconnectPlatform('twitch');
        });

        expect(mockStore.disconnectPlatform).toHaveBeenCalledWith('twitch');
    });

    it('debería permitir llamar a searchStream del store', () => {
        const mockStore = useConnectionsStore();
        const { result } = renderHook(() => useConnections(false));

        act(() => {
            result.current.searchStream('youtube');
        });

        expect(mockStore.searchStream).toHaveBeenCalledWith('youtube');
    });
});
