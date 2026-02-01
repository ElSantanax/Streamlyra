/**
 * Configuración de polling para YouTube API
 * Gestiona intervalos y consumo de cuota
 */
export const YouTubePollingConfig = {
    CHAT_POLLING_INTERVAL: 9000,
    VIEWER_POLLING_INTERVAL: 90000,
    AUTO_DISCOVERY_INTERVAL: 20000,        // Intervalo para intentos automáticos iniciales
    AUTO_DISCOVERY_MAX_ATTEMPTS: 3,        // Máximo 3 intentos automáticos
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
