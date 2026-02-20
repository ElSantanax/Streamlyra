import axios from 'axios';
import { logger } from '../../utils/logger';
import { config } from '../../config';

export class TwitchEventSubClient {
    private static appAccessToken: string | null = null;
    private static tokenExpiry: number = 0;

    static async getAppAccessToken(): Promise<string> {
        if (this.appAccessToken && Date.now() < this.tokenExpiry) {
            return this.appAccessToken;
        }

        try {
            logger.debug('Twitch: Solicitando nuevo App Access Token');
            const response = await axios.post<{ access_token: string; expires_in: number }>('https://id.twitch.tv/oauth2/token', null, {
                params: {
                    client_id: config.oauth.twitch.clientId!,
                    client_secret: config.oauth.twitch.clientSecret!,
                    grant_type: 'client_credentials'
                }
            });

            const { access_token, expires_in } = response.data;
            this.appAccessToken = access_token;
            this.tokenExpiry = Date.now() + (expires_in - 60) * 1000;

            return access_token;
        } catch (error) {
            const axiosError = error as { response?: { data?: unknown }, message: string };
            logger.error({
                err: axiosError.response?.data || axiosError.message
            }, 'Error obteniendo App Access Token de Twitch');
            throw error;
        }
    }

    static async subscribe(
        type: string,
        version: string,
        condition: Record<string, string>,
        callbackUrl: string,
        secret: string
    ): Promise<{ data: Array<{ id: string }> }> {
        try {
            logger.debug({ type, broadcasterId: condition.broadcaster_user_id }, 'Suscribiendo a evento de Twitch EventSub');

            const appToken = await this.getAppAccessToken();

            const response = await axios.post(
                'https://api.twitch.tv/helix/eventsub/subscriptions',
                {
                    type,
                    version,
                    condition,
                    transport: {
                        method: 'webhook',
                        callback: callbackUrl,
                        secret: secret
                    }
                },
                {
                    headers: {
                        'Client-ID': config.oauth.twitch.clientId!,
                        'Authorization': `Bearer ${appToken}`,
                        'Content-Type': 'application/json'
                    },
                    timeout: 10000
                }
            );

            return response.data;
        } catch (error: unknown) {
            const axiosError = error as { response?: { data?: unknown }, message: string };
            const broadcasterId = condition.broadcaster_user_id || condition.to_broadcaster_user_id || condition.user_id;

            logger.error({
                err: axiosError.response?.data || axiosError.message,
                type,
                broadcasterId
            }, 'Error suscribiendo a Twitch EventSub');
            throw error;
        }
    }

    static async deleteSubscription(id: string): Promise<void> {
        try {
            const appToken = await this.getAppAccessToken();
            await axios.delete(`https://api.twitch.tv/helix/eventsub/subscriptions?id=${id}`, {
                headers: {
                    'Client-ID': config.oauth.twitch.clientId!,
                    'Authorization': `Bearer ${appToken}`
                },
                timeout: 10000
            });
            logger.info({ subscriptionId: id }, 'Twitch Webhooks: Suscripción eliminada correctamente');
        } catch (error) {
            const axiosError = error as { response?: { data?: unknown }, message: string };
            logger.error({
                err: axiosError.response?.data || axiosError.message,
                subscriptionId: id
            }, 'Error eliminando suscripción de Twitch EventSub');
            throw error;
        }
    }

    static async listSubscriptions(status?: string): Promise<Array<{ id: string, type: string, condition: Record<string, string>, status: string }>> {
        try {
            const appToken = await this.getAppAccessToken();
            const response = await axios.get<{ data: Array<{ id: string, type: string, condition: Record<string, string>, status: string }> }>('https://api.twitch.tv/helix/eventsub/subscriptions', {
                params: status ? { status } : {},
                headers: {
                    'Client-ID': config.oauth.twitch.clientId!,
                    'Authorization': `Bearer ${appToken}`
                },
                timeout: 10000
            });
            return response.data.data;
        } catch (error) {
            const axiosError = error as { response?: { data?: unknown }, message: string };
            logger.error({
                err: axiosError.response?.data || axiosError.message
            }, 'Error listando suscripciones de Twitch EventSub');
            throw error;
        }
    }
}