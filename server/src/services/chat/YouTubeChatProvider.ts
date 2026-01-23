import axios from 'axios';
import { Server } from 'socket.io';
import { ChatProvider } from './ChatProvider';
import { Connection } from '../../models/Connection.model';
import { AuthService } from '../AuthService';
import colors from 'colors';

interface YouTubeBroadcast {
    status: {
        lifeCycleStatus: string;
    };
    snippet: {
        liveChatId: string;
    };
}

interface YouTubeBroadcastResponse {
    items: YouTubeBroadcast[];
}

interface YouTubeChatMessage {
    id: string;
    authorDetails: {
        displayName: string;
        profileImageUrl: string;
        isChatModerator: boolean;
        isChatOwner: boolean;
    };
    snippet: {
        displayMessage: string;
        publishedAt: string;
    };
}

interface YouTubeChatMessagesResponse {
    items: YouTubeChatMessage[];
    nextPageToken: string;
    pollingIntervalMillis: number;
}

export class YouTubeChatProvider implements ChatProvider {
    private intervals: Map<string, NodeJS.Timeout> = new Map();
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
            const liveChatId = await this.getLiveChatId(accessToken);
            if (!liveChatId) {
                console.log(colors.gray(`[YouTubeChat] No hay stream activo para ${userId}`));
                return;
            }

            console.log(colors.green(`✅ [YouTubeChat] Chat detectado: ${liveChatId}`));
            this.startPolling(userId, liveChatId, accessToken, io);

        } catch (error: unknown) {
            const err = error as { response?: { data: unknown }, message: string };
            console.error('[YouTubeChat] Error al iniciar:', err.response?.data || err.message);
        }
    }

    private async getLiveChatId(accessToken: string): Promise<string | null> {
        const response = await axios.get<YouTubeBroadcastResponse>('https://www.googleapis.com/youtube/v3/liveBroadcasts', {
            params: { part: 'snippet,status', mine: true, broadcastType: 'all', maxResults: 5 },
            headers: { Authorization: `Bearer ${accessToken}` }
        });

        const activeBroadcast = response.data.items?.find((b: YouTubeBroadcast) =>
            b.status.lifeCycleStatus === 'live' || b.snippet.liveChatId
        );

        return activeBroadcast?.snippet?.liveChatId || null;
    }

    private startPolling(userId: string, liveChatId: string, accessToken: string, io: Server) {
        if (this.intervals.has(userId)) this.disconnect(userId);

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

                        const chatMessage = {
                            id: item.id,
                            platform: 'youtube',
                            user: item.authorDetails.displayName,
                            message: item.snippet.displayMessage,
                            time: new Date(item.snippet.publishedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            avatar: item.authorDetails.profileImageUrl,
                            isMod: item.authorDetails.isChatModerator,
                            isOwner: item.authorDetails.isChatOwner
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

    async disconnect(userId: string): Promise<void> {
        if (this.intervals.has(userId)) {
            clearTimeout(this.intervals.get(userId));
            this.intervals.delete(userId);
            this.nextPageTokens.delete(userId);
            this.processedIds.delete(userId);
        }
    }
}
