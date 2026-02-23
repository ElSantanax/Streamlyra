import type { MeResponse } from '../../types';

// Cache global para persistencia entre navegaciones
export let cachedData: MeResponse | null = null;
export let lastFetchTime = 0;
export let activePromise: Promise<MeResponse> | null = null;

export const setCachedData = (data: MeResponse | null) => {
    cachedData = data;
};

export const setLastFetchTime = (time: number) => {
    lastFetchTime = time;
};

export const setActivePromise = (promise: Promise<MeResponse> | null) => {
    activePromise = promise;
};

export const invalidateConnectionsCache = () => {
    cachedData = null;
    lastFetchTime = 0;
    activePromise = null;
};
