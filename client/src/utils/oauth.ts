import { generatePKCE } from './pkce';

export const initiateOAuth = async (platform: 'twitch' | 'youtube' | 'kick') => {
    const redirectUri = `${window.location.origin}/auth/callback`;
    
    const configs: Record<string, { clientId: string; authUrl: string; scope: string; state: string; extras?: string }> = {
        twitch: {
            clientId: import.meta.env.VITE_TWITCH_CLIENT_ID as string,
            authUrl: 'https://id.twitch.tv/oauth2/authorize',
            scope: 'chat:read chat:edit user:read:email',
            state: 'twitch'
        },
        youtube: {
            clientId: import.meta.env.VITE_YOUTUBE_CLIENT_ID as string,
            authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
            scope: 'https://www.googleapis.com/auth/youtube.readonly email profile',
            state: `youtube_${Date.now()}`,
            extras: 'access_type=offline&prompt=consent&include_granted_scopes=false'
        },
        kick: {
            clientId: import.meta.env.VITE_KICK_CLIENT_ID as string,
            authUrl: 'https://id.kick.com/oauth/authorize',
            scope: 'user:read channel:read chat:write events:subscribe',
            state: 'kick'
        }
    };

    const config = configs[platform];
    
    if (!config.clientId) {
        alert(`Falta VITE_${platform.toUpperCase()}_CLIENT_ID en .env`);
        return;
    }

    // Kick requiere PKCE
    if (platform === 'kick') {
        const { verifier, challenge } = await generatePKCE();
        localStorage.setItem('kick_verifier', verifier);
        
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: config.scope,
            state: config.state,
            code_challenge: challenge,
            code_challenge_method: 'S256'
        });
        
        window.location.href = `${config.authUrl}?${params}`;
        return;
    }

    // Twitch y YouTube
    const params = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: config.scope,
        state: config.state
    });

    const url = config.extras 
        ? `${config.authUrl}?${params}&${config.extras}`
        : `${config.authUrl}?${params}`;
    
    window.location.href = url;
};
