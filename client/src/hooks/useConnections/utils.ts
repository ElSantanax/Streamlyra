import type { MeResponse, ConnectionStatus, ConnectionStats } from '../../types';
import { initialStatus, initialStats } from './constants';

export const parseMeResponse = (data: MeResponse | null) => {
    const status: Record<string, ConnectionStatus> = { ...initialStatus };
    const stats: Record<string, ConnectionStats> = { ...initialStats };

    if (data?.connections) {
        Object.keys(initialStatus).forEach(platform => {
            const fetched = data.connections[platform];
            if (fetched) {
                status[platform] = {
                    connected: fetched.connected,
                    username: fetched.username,
                    isLive: fetched.isLive
                };
                stats[platform] = {
                    viewers: fetched.viewers ?? 0,
                    sessionStartTime: fetched.sessionStartTime,
                    serverTime: fetched.serverTime
                };
            }
        });
    }
    return { status, stats };
};
