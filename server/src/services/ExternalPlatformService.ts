import axios from 'axios';
import { PlatformProfile, AuthTokens } from './AuthService';

export class ExternalPlatformService {

    static async getTwitchData(code: string) {
        // 1. Token Exchange
        const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.TWITCH_REDIRECT_URI
            }
        });

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // 2. Profile Fetch
        const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${access_token}`
            }
        });

        const twitchUser = userResponse.data.data[0];

        const profile: PlatformProfile = {
            provider: 'twitch',
            providerId: twitchUser.id,
            username: twitchUser.login,
            displayName: twitchUser.display_name,
            avatarUrl: twitchUser.profile_image_url,
            email: twitchUser.email
        };

        const tokens: AuthTokens = {
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresIn: expires_in
        };

        return { profile, tokens };
    }

    static async getYouTubeData(code: string) {
        // 1. Token Exchange
        const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
            code,
            client_id: process.env.YOUTUBE_CLIENT_ID,
            client_secret: process.env.YOUTUBE_CLIENT_SECRET,
            redirect_uri: process.env.YOUTUBE_REDIRECT_URI,
            grant_type: 'authorization_code'
        });

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // 2. Profile Fetch
        const userResponse = await axios.get('https://www.googleapis.com/youtube/v3/channels', {
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
            avatarUrl: channel.snippet.thumbnails?.default?.url
        };

        const tokens: AuthTokens = {
            accessToken: access_token,
            refreshToken: refresh_token,
            expiresIn: expires_in
        };

        return { profile, tokens };
    }
}
