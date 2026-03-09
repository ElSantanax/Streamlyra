import { renderHook, act } from '@testing-library/react';
import { useConnectionsApi } from '../useConnectionsApi';
import { authService } from '../../../services/api/auth.service';
import { invalidateConnectionsCache, setCachedData, setLastFetchTime } from '../cache';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { MeResponse } from '../../../types';

vi.mock('../../../services/api/auth.service', () => ({
    authService: {
        getMe: vi.fn()
    }
}));

describe('useConnectionsApi', () => {
    const mockProcessData = vi.fn();
    const mockSetIsLoading = vi.fn();
    const mockSetError = vi.fn();
    const mockIsMounted = { current: true };

    const defaultProps = {
        shouldFetch: true,
        isMounted: mockIsMounted,
        setIsLoading: mockSetIsLoading,
        setError: mockSetError,
        processData: mockProcessData
    };

    beforeEach(() => {
        vi.clearAllMocks();
        invalidateConnectionsCache();
    });

    it('debería obtener conexiones cuando no hay caché', async () => {
        const mockData = { connections: {} } as MeResponse;
        vi.mocked(authService.getMe).mockResolvedValue(mockData);

        const { result } = renderHook(() => useConnectionsApi(defaultProps));

        await act(async () => {
            await result.current.fetchConnections();
        });

        expect(authService.getMe).toHaveBeenCalled();
        expect(mockProcessData).toHaveBeenCalledWith(mockData);
        expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });

    it('debería usar datos de caché si son recientes', async () => {
        const mockData = { connections: { twitch: { connected: true } } } as unknown as MeResponse;
        setCachedData(mockData);
        setLastFetchTime(Date.now());

        const { result } = renderHook(() => useConnectionsApi(defaultProps));

        await act(async () => {
            await result.current.fetchConnections();
        });

        expect(authService.getMe).not.toHaveBeenCalled();
        expect(mockProcessData).toHaveBeenCalledWith(mockData);
    });

    it('debería forzar la obtención aunque haya caché si force=true', async () => {
        const mockData = { connections: {} } as MeResponse;
        setCachedData(mockData);
        setLastFetchTime(Date.now());
        vi.mocked(authService.getMe).mockResolvedValue({ ...mockData, lastFollower: { username: 'new' } } as unknown as MeResponse);

        const { result } = renderHook(() => useConnectionsApi(defaultProps));

        await act(async () => {
            await result.current.fetchConnections(true);
        });

        expect(authService.getMe).toHaveBeenCalled();
    });

    it('debería manejar errores de la API', async () => {
        vi.mocked(authService.getMe).mockRejectedValue(new Error('API Error'));

        const { result } = renderHook(() => useConnectionsApi(defaultProps));

        await act(async () => {
            await result.current.fetchConnections();
        });

        expect(mockSetError).toHaveBeenCalledWith('API Error');
        expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });
});
