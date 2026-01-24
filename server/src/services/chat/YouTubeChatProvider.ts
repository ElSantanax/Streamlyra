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
    private nextPageTokens: Map<string, string> = new Map();
    private processedIds: Map<string, Set<string>> = new Map();

    async connect(userId: string, io: Server): Promise<void> {
        const connection = await Connection.findOne({
            where: { userId, provider: 'youtube' }
        });

        if (!connection) return;

        const accessToken = await AuthService.getValidAccessToken(userId, 'youtube');

        if (!accessToken) {
            console.error(`[YouTubeChat] No se pudo obtener un token válido para ${userId}`);
            return;
        }

        console.log(colors.red(`[YouTubeChat] Buscando Live para ${userId}...`));

        try {
            const broadcast = await this.getLiveBroadcast(accessToken);
            if (!broadcast) {
                console.log(colors.gray(`[YouTubeChat] No hay stream activo para ${userId}`));
                return;
            }

            const liveChatId = broadcast.snippet?.liveChatId;
            const broadcastId = broadcast.id;

            if (liveChatId) {
                console.log(colors.green(`✅ [YouTubeChat] Chat detectado: ${liveChatId}`));
                this.startPolling(userId, liveChatId, accessToken, io);

                // Start polling viewers if we have a broadcast ID
                if (broadcastId) {
                    this.startViewerPolling(userId, broadcastId, accessToken, io);
                }
            }

        } catch (error: unknown) {
            const err = error as { response?: { data: unknown }, message: string };
            console.error('[YouTubeChat] Error al iniciar:', err.response?.data || err.message);
        }
    }

    private async getLiveBroadcast(accessToken: string): Promise<YouTubeBroadcast | null> {
        const response = await axios.get<YouTubeBroadcastResponse>('https://www.googleapis.com/youtube/v3/liveBroadcasts', {
            params: { part: 'snippet,status,id', mine: true, broadcastType: 'all', maxResults: 1 },
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        // Solo conectamos si hay un broadcast que esté actualmente 'live'
        return response.data.items?.find((b: YouTubeBroadcast) =>
            b.status.lifeCycleStatus === 'live'
        ) || null;
    }

    private startPolling(userId: string, liveChatId: string, accessToken: string, io: Server) {
        if (this.intervals.has(userId)) {
            clearTimeout(this.intervals.get(userId));
            this.intervals.delete(userId);
        }

        const poll = async () => {
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

                        // Detectar eventos especiales
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

                this.intervals.set(userId, setTimeout(poll, pollingIntervalMillis || 5000));

            } catch (error: unknown) {
                const err = error as { response?: { data: unknown }, message: string };
                console.error('[YouTubeChat] Poll Error:', err.response?.data || err.message);
                this.disconnect(userId);
            }
        };

        const initialTimeout = setTimeout(poll, 0);
        this.intervals.set(userId, initialTimeout);
    }

    private startViewerPolling(userId: string, broadcastId: string, accessToken: string, io: Server) {
        if (this.viewerIntervals.has(userId)) clearInterval(this.viewerIntervals.get(userId));

        const getStats = async () => {
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

            } catch (error) {
                console.error('[YouTubeViewer] Error fetching stats:', error);
            }
        };

        // Ejecutar inmediatamente y luego cada 60s
        getStats();
        this.viewerIntervals.set(userId, setInterval(getStats, 60000));
    }

    async disconnect(userId: string): Promise<void> {
        if (this.intervals.has(userId)) {
            clearTimeout(this.intervals.get(userId));
            this.intervals.delete(userId);
            this.nextPageTokens.delete(userId);
            this.processedIds.delete(userId);
        }

        if (this.viewerIntervals.has(userId)) {
            clearInterval(this.viewerIntervals.get(userId));
            this.viewerIntervals.delete(userId);
        }
    }
}
