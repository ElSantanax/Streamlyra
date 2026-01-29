/**
 * Configuración de polling para YouTube API
 * Gestiona intervalos y consumo de cuota
 */
export const YouTubePollingConfig = {
    CHAT_POLLING_INTERVAL: 9000,
    VIEWER_POLLING_INTERVAL: 90000,
    DISCOVERY_POLLING_INTERVAL: 120000,
    MAX_DISCOVERY_TIME_MS: 2 * 60 * 60 * 1000,
    MAX_DISCOVERY_ATTEMPTS: 60,
    DAILY_QUOTA_LIMIT: 10000,
    OPERATION_COSTS: {
        CHAT_MESSAGE: 5,
        VIDEO_DETAILS: 1,
        BROADCAST_LIST: 1,
        CHANNEL_INFO: 1
    }
};

export function calculateHourlyQuotaUsage(config: {
    CHAT_POLLING_INTERVAL: number;
    VIEWER_POLLING_INTERVAL: number;
    DISCOVERY_POLLING_INTERVAL: number;
    DAILY_QUOTA_LIMIT: number;
    OPERATION_COSTS: {
        CHAT_MESSAGE: number;
        VIDEO_DETAILS: number;
        BROADCAST_LIST: number;
        CHANNEL_INFO: number;
    };
} = YouTubePollingConfig): {
    chat: number;
    viewers: number;
    discovery: number;
    total: number;
    hoursPerDay: number;
} {
    const chatRequestsPerHour = (3600000 / config.CHAT_POLLING_INTERVAL);
    const viewerRequestsPerHour = (3600000 / config.VIEWER_POLLING_INTERVAL);
    const discoveryRequestsPerHour = (3600000 / config.DISCOVERY_POLLING_INTERVAL);

    const chatUnits = chatRequestsPerHour * config.OPERATION_COSTS.CHAT_MESSAGE;
    const viewerUnits = viewerRequestsPerHour * config.OPERATION_COSTS.VIDEO_DETAILS;
    const discoveryUnits = discoveryRequestsPerHour * config.OPERATION_COSTS.BROADCAST_LIST;

    const total = chatUnits + viewerUnits + discoveryUnits;
    const hoursPerDay = config.DAILY_QUOTA_LIMIT / total;

    return {
        chat: Math.round(chatUnits),
        viewers: Math.round(viewerUnits),
        discovery: Math.round(discoveryUnits),
        total: Math.round(total),
        hoursPerDay: Math.round(hoursPerDay * 10) / 10
    };
}
