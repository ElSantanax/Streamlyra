import { useCallback } from 'react';
import { authService } from '../../services/api/auth.service';
import type { MeResponse } from '../../types';
import {
    cachedData,
    lastFetchTime,
    activePromise,
    setCachedData,
    setLastFetchTime,
    setActivePromise
} from './cache';
import { CACHE_DURATION } from './constants';

interface ApiHandlersProps {
    shouldFetch: boolean;
    isMounted: React.MutableRefObject<boolean>;
    setIsLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    processData: (data: MeResponse) => void;
}

export const useConnectionsApi = ({
    shouldFetch,
    isMounted,
    setIsLoading,
    setError,
    processData
}: ApiHandlersProps) => {
    const fetchConnections = useCallback(async (force = false) => {
        if (!shouldFetch) {
            if (isMounted.current) setIsLoading(false);
            return;
        }

        const now = Date.now();
        if (!force && cachedData && (now - lastFetchTime < CACHE_DURATION)) {
            processData(cachedData);
            if (isMounted.current) setIsLoading(false);
            return;
        }

        if (isMounted.current) {
            // Solo mostrar loading si NO tenemos datos previos (para evitar flicker)
            if (!cachedData) {
                setIsLoading(true);
            }
            setError(null);
        }

        try {
            let data;
            // Usar activePromise si ya hay una petición en vuelo
            if (activePromise && !force) {
                data = await activePromise;
            } else {
                const promise = authService.getMe();
                setActivePromise(promise);

                try {
                    data = await promise;
                    setCachedData(data);
                    setLastFetchTime(Date.now());
                } finally {
                    setActivePromise(null);
                }
            }

            if (isMounted.current) {
                processData(data);
            }

        } catch (err) {
            if (isMounted.current) {
                setError(err instanceof Error ? err.message : 'Error fetching connections');
            }
        } finally {
            if (isMounted.current) {
                setIsLoading(false);
            }
        }
    }, [shouldFetch, processData, isMounted, setIsLoading, setError]);

    return { fetchConnections };
};
