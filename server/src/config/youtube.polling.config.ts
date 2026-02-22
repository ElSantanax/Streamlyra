/**
 * Configuración de polling para YouTube API
 * Gestiona intervalos y consumo de cuota
 */
export const YouTubePollingConfig = {
    CHAT_POLLING_INTERVAL: 15000,    // Aumentado a 15s para ahorrar 40% de cuota
    VIEWER_POLLING_INTERVAL: 180000, // Aumentado a 3 min (métrica secundaria)
    AUTO_DISCOVERY_INTERVAL: 90000,  // 90s para cumplir "3 intentos en 3 min"
    AUTO_DISCOVERY_MAX_ATTEMPTS: 3,  // Máximo 3 intentos de búsqueda automática
    AUTO_DISCOVERY_STANDBY_INTERVAL: 300000, // 5 minutos en modo espera
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
