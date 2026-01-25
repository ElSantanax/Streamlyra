import axios from 'axios';
import { Server } from 'socket.io';
import { ChatProvider } from './ChatProvider';
import { Connection } from '../../models/Connection.model';
import { ConnectionService } from '../connection/ConnectionService';
import { MessageDeduplicator } from '../../utils/messageDeduplicate';
import { retryWithInterval } from '../../utils/retryWithInterval';
import { PollingManager } from './PollingManager';
import {
    YouTubeBroadcast,
    YouTubeBroadcastResponse,
    YouTubeChatMessage,
    YouTubeChatMessagesResponse,
    YouTubeVideoResponse
} from '../../types/youtube.types';

export class YouTubeChatProvider implements ChatProvider {
    private chatPolling: PollingManager = new PollingManager();
    private viewerPolling: PollingManager = new PollingManager();
    private discoveryCleanup: Map<string, () => void> = new Map();
    private nextPageTokens: Map<string, string> = new Map();
    private deduplicators: Map<string, MessageDeduplicator> = new Map();

    async connect(userId: string, io: Server): Promise<void> {
        const connection = await Connection.findOne({
            where: { userId: String(userId), provider: 'youtube' }
        });

        if (!connection) return;

        await this.disconnect(userId);

        io.to(userId).emit('connection_status', {
            platform: 'youtube',
            status: 'connecting'
        });

        const tryConnect = async () => {
            const stillExists = await Connection.findOne({
                where: { userId: String(userId), provider: 'youtube' }
            });
            if (!stillExists) {
                this.stopDiscovery(userId);
                return;
            }

            const accessToken = await ConnectionService.getValidAccessToken(userId, 'youtube');
            if (!accessToken) return;

            const broadcast = await this.getLiveBroadcast(accessToken);
            if (!broadcast) {
                throw new Error('No broadcast found');
            }

            const liveChatId = broadcast.snippet?.liveChatId;
            const broadcastId = broadcast.id;

            if (liveChatId) {
                console.log(`[YouTubeChat] ✅ Live detectado para ${userId}: ${liveChatId}`);
                this.stopDiscovery(userId);

                io.to(userId).emit('connection_status', {
                    platform: 'youtube',
                    status: 'connected'
                });

                this.startPolling(userId, liveChatId, accessToken, io);
                if (broadcastId) {
                    this.startViewerPolling(userId, broadcastId, accessToken, io);
                }
            }
        };

        const cleanup = retryWithInterval(tryConnect, {
            intervalMs: 60000,
            onError: () => { }
        });

        this.discoveryCleanup.set(userId, cleanup);
    }

    private stopDiscovery(userId: string) {
        const cleanup = this.discoveryCleanup.get(userId);
        if (cleanup) {
            cleanup();
            this.discoveryCleanup.delete(userId);
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
        const dedup = new MessageDeduplicator();
        this.deduplicators.set(userId, dedup);

        const pollTask = async () => {
            try {
                const response = await axios.get<YouTubeChatMessagesResponse>('https://www.googleapis.com/youtube/v3/liveChat/messages', {
                    params: { liveChatId, part: 'snippet,authorDetails', pageToken: this.nextPageTokens.get(userId) },
                    headers: { Authorization: `Bearer ${accessToken}` }
                });

                const { items, nextPageToken, pollingIntervalMillis } = response.data;
                if (nextPageToken) this.nextPageTokens.set(userId, nextPageToken);

                items?.forEach((item: YouTubeChatMessage) => {
                    if (dedup.isDuplicate(item.id)) return;

                    let specialMessage: string | undefined;
                    let displayMessage = item.snippet.displayMessage;
                    let isSub = item.authorDetails.isChatSponsor;

                    const type = item.snippet.type;
                    if (type === 'superChatEvent') {
                        specialMessage = `¡DONACIÓN DE ${item.snippet.superChatDetails?.amountDisplayString}! 💰`;
                        displayMessage = item.snippet.superChatDetails?.userComment || '';
                    } else if (type === 'newMemberEvent') {
                        specialMessage = `¡NUEVO MIEMBRO: ${item.snippet.newMemberDetails?.memberLevelName}! 💎`;
                        isSub = true;
                    } else if (type === 'memberMilestoneChatEvent') {
                        const months = item.snippet.memberMilestoneChatDetails?.memberMonth;
                        specialMessage = `¡MIEMBRO POR ${months} ${months === 1 ? 'MES' : 'MESES'}! 🔥`;
                        displayMessage = item.snippet.memberMilestoneChatDetails?.userComment || '';
                        isSub = true;
                    } else if (type === 'membershipGiftingEvent') {
                        specialMessage = `¡HA REGALADO ${item.snippet.membershipGiftingDetails?.giftMembershipsCount} MEMBRESÍAS! 🎁`;
                    }

                    io.to(userId).emit('chat_message', {
                        id: item.id,
                        platform: 'youtube',
                        user: item.authorDetails.displayName,
                        message: displayMessage,
                        specialMessage,
                        time: new Date(item.snippet.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        avatar: item.authorDetails.profileImageUrl,
                        isMod: item.authorDetails.isChatModerator,
                        isOwner: item.authorDetails.isChatOwner,
                        isSub,
                        isVIP: item.authorDetails.isVerified
                    });
                });

                // Update interval if provided by API
                if (pollingIntervalMillis) {
                    this.chatPolling.start(userId, pollTask, pollingIntervalMillis);
                }

            } catch (error: unknown) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                console.error('[YouTubeChat] Poll Error:', errorMessage);
                const stillConnected = await Connection.findOne({ where: { userId: String(userId), provider: 'youtube' } });

                if (stillConnected) {
                    await this.disconnect(userId);
                    void this.connect(userId, io);
                } else {
                    await this.disconnect(userId);
                }
            }
        };

        this.chatPolling.start(userId, pollTask, 5000);
    }

    private startViewerPolling(userId: string, broadcastId: string, accessToken: string, io: Server) {
        this.viewerPolling.start(userId, async () => {
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
                // Ignore errors during background polling
            }
        });
    }

    async disconnect(userId: string): Promise<void> {
        this.stopDiscovery(userId);
        this.chatPolling.stop(userId);
        this.viewerPolling.stop(userId);
        this.deduplicators.delete(userId);
        this.nextPageTokens.delete(userId);
    }
}
