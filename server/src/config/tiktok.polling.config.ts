/**
 * Configuración de polling para TikTok
 * Gestiona intervalos de descubrimiento y reconexión
 */
export const TikTokPollingConfig = {
    AUTO_DISCOVERY_INTERVAL_MS: 15000,
    AUTO_DISCOVERY_MAX_ATTEMPTS: 12,
    RECONNECTION_DELAY_MS: 5000,
    VIEWER_POLLING_INTERVAL_MS: 30000
};
