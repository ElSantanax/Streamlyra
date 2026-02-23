import type { ConnectionStatus, ConnectionStats } from '../../types';

export const initialStatus: Record<string, ConnectionStatus> = {
    twitch: { connected: false },
    youtube: { connected: false },
    tiktok: { connected: false },
    kick: { connected: false },
};

export const initialStats: Record<string, ConnectionStats> = {
    twitch: { viewers: 0 },
    youtube: { viewers: 0 },
    tiktok: { viewers: 0 },
    kick: { viewers: 0 },
};

export const CACHE_DURATION = 30000;
