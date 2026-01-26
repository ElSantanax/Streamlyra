/**
 * Configuración centralizada de variables de entorno
 * Todas las variables de entorno deben ser accedidas desde aquí
 */

export const env = {
  // API Configuration
  apiUrl: import.meta.env.VITE_API_URL as string | undefined || '/api',
  socketUrl: (import.meta.env.VITE_SOCKET_URL as string | undefined) || 'http://localhost:4000',

  // OAuth Clients
  oauth: {
    twitch: {
      clientId: import.meta.env.VITE_TWITCH_CLIENT_ID as string,
    },
    youtube: {
      clientId: import.meta.env.VITE_YOUTUBE_CLIENT_ID as string,
    },
    kick: {
      clientId: import.meta.env.VITE_KICK_CLIENT_ID as string,
    },
  },

  // Feature Flags
  features: {
    enableTikTok: true,
    enableKick: true,
  },
} as const;

// Validación de variables críticas
export const validateEnv = () => {
  const required = [
    { key: 'VITE_TWITCH_CLIENT_ID', value: env.oauth.twitch.clientId },
  ];

  const missing = required.filter(({ value }) => !value);

  if (missing.length > 0) {
    console.warn(
      '⚠️ Missing environment variables:',
      missing.map(({ key }) => key).join(', ')
    );
  }
};
