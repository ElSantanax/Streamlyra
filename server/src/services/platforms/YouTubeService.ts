import axios from 'axios';
import { PlatformProfile, AuthTokens } from '../AuthService';

interface YouTubeTokenResponse {
    access_token: string;
    refresh_token: string;
    expires_in: number;
}

interface YouTubeChannelResponse {
    items: Array<{
        id: string;
        snippet: {
            title: string;
            thumbnails: {
                default?: {
                    url: string;
                }
            }
        }
    }>;
}

export class YouTubeService {
    static async getProfileAndTokens(code: string) {
        // 1. Token Exchange
        const tokenResponse = await axios.post<YouTubeTokenResponse>('https://oauth2.googleapis.com/token', {
            code,
            client_id: process.env.YOUTUBE_CLIENT_ID,
            client_secret: process.env.YOUTUBE_CLIENT_SECRET,
            redirect_uri: process.env.YOUTUBE_REDIRECT_URI,
            grant_type: 'authorization_code'
        });

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // 2. Profile Fetch
        const userResponse = await axios.get<YouTubeChannelResponse>('https://www.googleapis.com/youtube/v3/channels', {
            params: { part: 'snippet', mine: true },
            headers: { Authorization: `Bearer ${access_token}` }
        });

        const items = userResponse.data.items;
        if (!items || items.length === 0) {
            throw new Error('No se encontró canal de YouTube asociado.');
        }

        const channel = items[0];

        const profile: PlatformProfile = {
            provider: 'youtube',
            providerId: channel.id,
            username: channel.snippet.title.replace(/\s+/g, '').toLowerCase().substring(0, 15),
            displayName: channel.snippet.title,
            avatarUrl: channel.snippet.thumbnails?.default?.url || ''
        };

        const tokens: AuthTokens = {
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresIn: expires_in
        };

        return { profile, tokens };
    }

    static async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
        const response = await axios.post<YouTubeTokenResponse>('https://oauth2.googleapis.com/token', {
            refresh_token: refreshToken,
            client_id: process.env.YOUTUBE_CLIENT_ID,
            client_secret: process.env.YOUTUBE_CLIENT_SECRET,
            grant_type: 'refresh_token'
        });

        const { access_token, refresh_token: new_refresh_token, expires_in } = response.data;
        return {
            accessToken: access_token,
            refreshToken: new_refresh_token || refreshToken,
            expiresIn: expires_in
        };
    }
}
