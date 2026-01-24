import axios from 'axios';
import { Server } from 'socket.io';
import { ChatProvider } from './ChatProvider';
import { Connection } from '../../models/Connection.model';
import { AuthService } from '../AuthService';
import colors from 'colors';
import {
    YouTubeBroadcast,
    YouTubeBroadcastResponse,
    YouTubeChatMessage,
    YouTubeChatMessagesResponse,
    YouTubeVideoResponse
} from '../../types/youtube.types';

export class YouTubeChatProvider implements ChatProvider {
    private intervals: Map<string, NodeJS.Timeout> = new Map();
    private viewerIntervals: Map<string, NodeJS.Timeout> = new Map();
    private discoveryIntervals: Map<string, NodeJS.Timeout> = new Map();
    private nextPageTokens: Map<string, string> = new Map();
    private processedIds: Map<string, Set<string>> = new Map();

    async connect(userId: string, io: Server): Promise<void> {
        const connection = await Connection.findOne({
            where: { userId, provider: 'youtube' }
        });

        if (!connection) return;

        // Limpiar cualquier búsqueda o conexión previa
        this.stopDiscovery(userId);
        await this.disconnect(userId);

        const tryConnect = async () => {
            // Guard: No reconectar si el usuario ya borró la plataforma
            const stillExists = await Connection.findOne({ where: { userId, provider: 'youtube' } });
            if (!stillExists) {
                this.stopDiscovery(userId);
                return;
            }

            const accessToken = await AuthService.getValidAccessToken(userId, 'youtube');
            if (!accessToken) return;

            try {
                const broadcast = await this.getLiveBroadcast(accessToken);

                if (!broadcast) {
                    if (!this.discoveryIntervals.has(userId)) {
                        console.log(colors.gray(`[YouTubeChat] Buscando stream activo para ${userId}... (Reintento en 60s)`));
                        const interval = setInterval(() => void tryConnect(), 60000);
                        this.discoveryIntervals.set(userId, interval);
                    }
                    return;
                }

                const liveChatId = broadcast.snippet?.liveChatId;
                const broadcastId = broadcast.id;

                if (liveChatId) {
                    console.log(colors.green(`✅ [YouTubeChat] Live detectado para ${userId}: ${liveChatId}`));
                    this.stopDiscovery(userId);

                    this.startPolling(userId, liveChatId, accessToken, io);

                    if (broadcastId) {
                        this.startViewerPolling(userId, broadcastId, accessToken, io);
                    }
                }
            } catch {
                if (!this.discoveryIntervals.has(userId)) {
                    const interval = setInterval(() => void tryConnect(), 60000);
                    this.discoveryIntervals.set(userId, interval);
                }
            }
        };

        void tryConnect();
    }

    private stopDiscovery(userId: string) {
        const interval = this.discoveryIntervals.get(userId);
        if (interval) {
            clearInterval(interval);
            this.discoveryIntervals.delete(userId);
        }
    }

    private async getLiveBroadcast(accessToken: string): Promise<YouTubeBroadcast | null> {
        const response = await axios.get<YouTubeBroadcastResponse>('https://www.googleapis.com/youtube/v3/liveBroadcasts', {
            params: { part: 'snippet,status,id', mine: true, broadcastType: 'all', maxResults: 1 },
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        return response.data.items?.find((b: YouTubeBroadcast) =>
            b.status.lifeCycleStatus === 'live'
        ) || null;
    }

    private startPolling(userId: string, liveChatId: string, accessToken: string, io: Server) {
        const poll = async () => {
            // Si el intervalo fue limpiado (disconnect), paramos el bucle manual
            if (!this.intervals.has(userId)) return;

            try {
                const pageToken = this.nextPageTokens.get(userId);
                const response = await axios.get<YouTubeChatMessagesResponse>('https://www.googleapis.com/youtube/v3/liveChat/messages', {
                    params: { liveChatId, part: 'snippet,authorDetails', pageToken },
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                const { items, nextPageToken, pollingIntervalMillis } = response.data;
                this.nextPageTokens.set(userId, nextPageToken);

                if (items && items.length > 0) {
                    if (!this.processedIds.has(userId)) this.processedIds.set(userId, new Set());
                    const seenIds = this.processedIds.get(userId)!;

                    items.forEach((item: YouTubeChatMessage) => {
                        if (seenIds.has(item.id)) return;

                        let specialMessage: string | undefined;
                        let displayMessage = item.snippet.displayMessage;
                        let isSub = false;

                        switch (item.snippet.type) {
                            case 'superChatEvent':
                                specialMessage = `¡DONACIÓN DE ${item.snippet.superChatDetails?.amountDisplayString}! 💰`;
                                displayMessage = item.snippet.superChatDetails?.userComment || '';
                                break;
                            case 'newMemberEvent':
                                specialMessage = `¡NUEVO MIEMBRO: ${item.snippet.newMemberDetails?.memberLevelName}! 💎`;
                                isSub = true;
                                break;
                            case 'memberMilestoneChatEvent': {
                                const months = item.snippet.memberMilestoneChatDetails?.memberMonth;
                                specialMessage = `¡MIEMBRO POR ${months} ${months === 1 ? 'MES' : 'MESES'}! 🔥`;
                                displayMessage = item.snippet.memberMilestoneChatDetails?.userComment || '';
                                isSub = true;
                                break;
                            }
                            case 'membershipGiftingEvent':
                                specialMessage = `¡HA REGALADO ${item.snippet.membershipGiftingDetails?.giftMembershipsCount} MEMBRESÍAS! 🎁`;
                                break;
                        }

                        const chatMessage = {
                            id: item.id,
                            platform: 'youtube',
                            user: item.authorDetails.displayName,
                            message: displayMessage,
                            specialMessage,
                            time: new Date(item.snippet.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            avatar: item.authorDetails.profileImageUrl,
                            isMod: item.authorDetails.isChatModerator,
                            isOwner: item.authorDetails.isChatOwner,
                            isSub: isSub || item.authorDetails.isChatSponsor,
                            isVIP: item.authorDetails.isVerified
                        };

                        seenIds.add(item.id);
                        if (seenIds.size > 200) {
                            const first = seenIds.values().next().value as string | undefined;
                            if (first !== undefined) seenIds.delete(first);
                        }

                        io.to(userId).emit('chat_message', chatMessage);
                    });
                }

                // Siguiente poll
                const nextPoll = setTimeout(poll, pollingIntervalMillis || 5000);
                this.intervals.set(userId, nextPoll);

            } catch (error: unknown) {
                const err = error as Error;
                console.error('[YouTubeChat] Poll Error (Live finalizado?):', err.message);

                // Si el poll falla, verificar si el usuario aún quiere YouTube
                const stillConnected = await Connection.findOne({ where: { userId, provider: 'youtube' } });

                if (stillConnected) {
                    await this.disconnect(userId);
                    void this.connect(userId, io);
                } else {
                    console.log(colors.gray(`[YouTubeChat] Desconexión definitiva para ${userId} (Plataforma eliminada).`));
                    await this.disconnect(userId);
                }
            }
        };

        // Iniciamos el ciclo
        const firstPoll = setTimeout(poll, 0);
        this.intervals.set(userId, firstPoll);
    }

    private startViewerPolling(userId: string, broadcastId: string, accessToken: string, io: Server) {
        const getStats = async () => {
            if (!this.viewerIntervals.has(userId)) return;

            try {
                const response = await axios.get<YouTubeVideoResponse>('https://www.googleapis.com/youtube/v3/videos', {
                    params: { part: 'liveStreamingDetails', id: broadcastId },
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                const video = response.data.items?.[0];
                const viewerCount = video?.liveStreamingDetails?.concurrentViewers || '0';

                io.to(userId).emit('viewers_update', {
                    platform: 'youtube',
                    count: parseInt(viewerCount)
                });

            } catch {
                // Silencioso
            }
        };

        getStats();
        const interval = setInterval(getStats, 60000);
        this.viewerIntervals.set(userId, interval);
    }

    async disconnect(userId: string): Promise<void> {
        this.stopDiscovery(userId);

        const chatInt = this.intervals.get(userId);
        if (chatInt) clearTimeout(chatInt);
        this.intervals.delete(userId);

        const viewInt = this.viewerIntervals.get(userId);
        if (viewInt) clearInterval(viewInt);
        this.viewerIntervals.delete(userId);

        this.nextPageTokens.delete(userId);
        this.processedIds.delete(userId);
    }
}
