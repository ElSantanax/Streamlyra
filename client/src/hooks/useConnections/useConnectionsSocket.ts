import { useEffect } from 'react';
import { socket } from '../../services/socket';
import type {
    ConnectionStatus,
    ConnectionStats,
    ConnectionStatusUpdate,
    ViewersUpdate,
    LastFollower,
    LastRaid
} from '../../types';

interface SocketHandlersProps {
    statusRef: React.MutableRefObject<Record<string, ConnectionStatus>>;
    updateStatus: (platform: string, updates: Partial<ConnectionStatus>) => void;
    updateStats: (platform: string, updates: Partial<ConnectionStats>) => void;
    setLastFollower: (follower: LastFollower) => void;
    setLastRaid: (raid: LastRaid) => void;
}

export const useConnectionsSocket = ({
    statusRef,
    updateStatus,
    updateStats,
    setLastFollower,
    setLastRaid
}: SocketHandlersProps) => {
    useEffect(() => {
        const onConnectionStatus = (data: ConnectionStatusUpdate) => {
            updateStatus(data.platform, {
                connected: data.status === 'connected' || data.status === 'waiting_stream' || data.status === 'connecting',
                status: data.status,
                statusMessage: data.message,
                isLive: data.isLive
            });

            if (data.serverTime) {
                updateStats(data.platform, {
                    sessionStartTime: data.sessionStartTime,
                    serverTime: data.serverTime
                });
            }
        };

        const onViewersUpdate = (data: ViewersUpdate) => {
            if (!statusRef.current[data.platform]?.connected) return;

            updateStats(data.platform, {
                viewers: data.count,
                sessionStartTime: data.sessionStartTime,
                serverTime: data.serverTime
            });

            if (data.isLive !== undefined && data.isLive !== statusRef.current[data.platform]?.isLive) {
                updateStatus(data.platform, { isLive: data.isLive });
            }
        };

        const onLastFollowerUpdate = (data: LastFollower) => {
            setLastFollower(data);
        };

        const onLastRaidUpdate = (data: LastRaid) => {
            setLastRaid(data);
        };

        socket.on('connection_status', onConnectionStatus);
        socket.on('viewers_update', onViewersUpdate);
        socket.on('last_follower_update', onLastFollowerUpdate);
        socket.on('last_raid_update', onLastRaidUpdate);

        return () => {
            socket.off('connection_status', onConnectionStatus);
            socket.off('viewers_update', onViewersUpdate);
            socket.off('last_follower_update', onLastFollowerUpdate);
            socket.off('last_raid_update', onLastRaidUpdate);
        };
    }, [updateStatus, updateStats, setLastFollower, setLastRaid, statusRef]);
};
