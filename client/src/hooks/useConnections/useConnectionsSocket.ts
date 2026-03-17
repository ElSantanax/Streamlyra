import { useEffect } from 'react';
import { socket } from '../../services/socket';
import { useConnectionsStore } from '../../store/useConnectionsStore';
import type {
    ConnectionStatusUpdate,
    ViewersUpdate,
    LastFollower,
    LastRaid
} from '../../types';

/**
 * Hook para manejar los eventos de WebSocket relacionados con las conexiones.
 * Ahora se comunica directamente con el store de Zustand para evitar re-renders innecesarios.
 */
export const useConnectionsSocket = () => {
    useEffect(() => {
        // Acciones estables del store
        const { 
            updateStatus, 
            updateStats, 
            setLastFollower, 
            setLastRaid 
        } = useConnectionsStore.getState();

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
            // Consulta de estado actual sin suscripción
            const currentStatus = useConnectionsStore.getState().connectionsStatus;
            
            if (!currentStatus[data.platform]?.connected) return;

            updateStats(data.platform, {
                viewers: data.count,
                sessionStartTime: data.sessionStartTime,
                serverTime: data.serverTime
            });

            const isLiveChanged = data.isLive !== undefined && data.isLive !== currentStatus[data.platform]?.isLive;
            if (isLiveChanged) {
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
    }, []); // Efecto limpio sin dependencias reactivas ruidosas
};

