/**
 * Configuración de polling para YouTube API
 * Gestiona intervalos y consumo de cuota
 */
export const YouTubePollingConfig = {
    CHAT_POLLING_INTERVAL: 15000,    // Aumentado a 15s para ahorrar 40% de cuota
    VIEWER_POLLING_INTERVAL: 180000, // Aumentado a 3 min (métrica secundaria)
    AUTO_DISCOVERY_INTERVAL: 15000,  // 15s para una respuesta casi inmediata
    AUTO_DISCOVERY_MAX_ATTEMPTS: 6,  // 6 intentos antes de pasar a standby
    AUTO_DISCOVERY_STANDBY_INTERVAL: 60000, // 1 minuto en modo espera (en lugar de 5)
    QUOTA_PERSIST_INTERVAL_MS: 30000, // Persistir en DB cada 30 segundos
    DAILY_QUOTA_LIMIT: 10000,
    OPERATION_COSTS: {
        CHAT_MESSAGE_SEND: 50,    // liveChatMessages.insert
        CHAT_MESSAGE_LIST: 1,     // liveChatMessages.list
        CHAT_MESSAGE_DELETE: 50,  // liveChatMessages.delete
        CHAT_BAN_USER: 50,        // liveChatBans.insert
        VIDEO_DETAILS: 1,         // videos.list
        BROADCAST_LIST: 1,        // liveBroadcasts.list
        CHANNEL_INFO: 1           // channels.list
    }
};
