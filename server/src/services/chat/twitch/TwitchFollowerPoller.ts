/** Encuestador de seguidores de Twitch con detección de cambios */

import axios from 'axios';
import { Server } from 'socket.io';
import { TwitchFollowerResponse } from '../../../types/twitch.types';
import { PollingManager } from '../shared/PollingManager';
import { config } from '../../../config';
import { SafeSocketEmitter } from '../../../utils/SafeSocketEmitter';
import { logger } from '../../../utils/logger';
import { TwitchEventTransformer } from '../transformers/TwitchEventTransformer';

export class TwitchFollowerPoller {
    private polling: PollingManager = new PollingManager();
    private lastFollowerId: Map<string, string> = new Map();
    private transformer: TwitchEventTransformer;

    constructor() {
        this.transformer = new TwitchEventTransformer();
    }

    startPolling(userId: string, broadcasterId: string, getAccessToken: () => Promise<string | null>, io: Server): void {
        this.polling.start(userId, async () => {
            try {
                // Obtener token fresco en cada iteración (usa cache interno del servicio, no golpea DB siempre)
                const accessToken = await getAccessToken();
                if (!accessToken) {
                    logger.warn({ userId }, 'Twitch Follow Polling: No access token available');
                    return;
                }

                const response = await axios.get<TwitchFollowerResponse>('https://api.twitch.tv/helix/channels/followers', {
                    params: { broadcaster_id: broadcasterId, first: 20 },
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Client-ID': config.oauth.twitch.clientId!
                    },
                    timeout: 10000
                });

                const followers = response.data.data;
                if (!followers || followers.length === 0) return;

                const lastKnownId = this.lastFollowerId.get(userId);

                // Si es la primera vez que corre, solo guardamos el último y no emitimos
                // para evitar spam de "nuevos" seguidores viejos al reconectar
                if (!lastKnownId) {
                    this.lastFollowerId.set(userId, followers[0].user_id);
                    return;
                }

                // Buscar nuevos seguidores desde el último conocido
                const newFollowers = [];
                for (const follower of followers) {
                    if (follower.user_id === lastKnownId) break;
                    newFollowers.unshift(follower); // Añadir al principio para emitir en orden cronológico
                }

                // Emitir eventos para nuevos seguidores
                if (newFollowers.length > 0) {
                    logger.info({ userId, count: newFollowers.length }, 'Twitch: detected new followers');

                    for (const follower of newFollowers) {
                        const normalizedMessage = this.transformer.transformFollow(follower);
                        SafeSocketEmitter.emitChatMessage(io, userId, normalizedMessage, 'twitch');
                    }

                    // Actualizar el último ID conocido
                    this.lastFollowerId.set(userId, followers[0].user_id);
                }

            } catch (error) {
                // Si falta el scope, no spamear logs de error
                if (axios.isAxiosError(error) && error.response?.status === 401) {
                    logger.warn({ userId }, 'Twitch Follow Polling: Unauthorized (401), waiting for token refresh on next cycle');
                    // No detenemos el polling, esperamos al siguiente ciclo donde getAccessToken() debería refrescar
                } else {
                    logger.error({ err: error, userId }, 'Twitch follower polling error');
                }
            }
        }, 1000); // Polling cada 1 segundo (ultra-baja latencia)
    }

    stopPolling(userId: string): void {
        this.polling.stop(userId);
        this.lastFollowerId.delete(userId);
    }
}
