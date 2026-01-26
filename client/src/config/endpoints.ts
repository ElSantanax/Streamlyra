/**
 * Endpoints centralizados de la API
 * Facilita el cambio de rutas y versionado
 */

export const endpoints = {
  auth: {
    me: '/auth/me',
    twitch: '/auth/twitch',
    youtube: '/auth/youtube',
    kick: '/auth/kick',
    tiktok: '/auth/tiktok',
    platform: '/auth/platform',
  },
  
  oauth: {
    twitch: 'https://id.twitch.tv/oauth2/authorize',
    youtube: 'https://accounts.google.com/o/oauth2/v2/auth',
    kick: 'https://id.kick.com/oauth/authorize',
  },
} as const;
