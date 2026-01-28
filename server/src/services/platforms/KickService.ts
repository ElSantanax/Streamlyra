import axios from 'axios';
import { BasePlatformService, PlatformProfile } from '../base/BasePlatformService';
import { config } from '../../config';
import { OAuthExchangeOptions } from '../../utils/oauth.utils';
import { logger } from '../../utils/logger';

interface KickUser {
    user_id: number;
    name: string;
    email?: string;
    profile_picture: string;
}

interface KickUserResponse {
    data: KickUser[];
}

interface KickChannel {
    broadcaster_user_id: number;
    slug: string;
    stream?: {
        is_live: boolean;
        viewer_count: number;
    } | null;
    stream_title?: string;
}

interface KickChannelResponse {
    data: KickChannel[];
}

/**
 * Servicio de Kick
 * Responsabilidad: Autenticación OAuth específica de Kick
 * 
 * Hereda métodos genéricos de BasePlatformService:
 * - getProfileAndTokens(code, codeVerifier)
 * - refreshAccessToken(refreshToken)
 * 
 * Implementa métodos específicos de Kick:
 * - fetchUserProfile(accessToken)
 * - normalizePlatformProfile(kickUser)
 * 
 * Métodos adicionales específicos de Kick:
 * - getChannelByToken(accessToken) - Obtiene información del canal
 * - subscribeToChat(accessToken, broadcasterUserId) - Suscribe a webhooks
 * 
 * NOTA: Kick es la plataforma más compleja:
 * - Soporta PKCE (codeVerifier)
 * - Tiene métodos adicionales para webhooks
 * - Requiere contentType: 'form' en OAuth
 */
import { Platform } from '../../constants/platforms';

export class KickService extends BasePlatformService {
    protected readonly platformName: Platform = 'kick';

    private static readonly TOKEN_URL = 'https://id.kick.com/oauth/token';
    private static readonly USER_URL = 'https://api.kick.com/public/v1/users';
    private static readonly CHANNEL_URL = 'https://api.kick.com/public/v1/channels';

    protected readonly oauthOptions: OAuthExchangeOptions = {
        baseUrl: KickService.TOKEN_URL,
        clientId: config.kick.clientId!,
        clientSecret: config.kick.clientSecret!,
        redirectUri: config.kick.redirectUri!,
        contentType: 'form'
    };

    /**
     * Obtiene perfil del usuario desde la API de Kick
     * 
     * Endpoint: GET https://api.kick.com/public/v1/users
     * Retorna: Array con 1 usuario
     */
    protected async fetchUserProfile(accessToken: string): Promise<KickUser> {
        const userResponse = await axios.get<KickUserResponse>(KickService.USER_URL, {
            headers: { 'Authorization': `Bearer ${accessToken}` }
        });

        return userResponse.data.data[0];
    }

    /**
     * Normaliza perfil de Kick al formato común
     */
    protected normalizePlatformProfile(kickUser: KickUser): PlatformProfile {
        return {
            provider: 'kick',
            providerId: kickUser.user_id.toString(),
            providerUsername: kickUser.name,
            displayName: kickUser.name,
            avatarUrl: kickUser.profile_picture,
            email: kickUser.email
        };
    }

    /**
     * Obtiene información del canal del usuario
     * 
     * Método específico de Kick (no genérico)
     * Usado para obtener información del stream en vivo
     */
    static async getChannelByToken(accessToken: string): Promise<KickChannel[]> {
        const response = await axios.get<KickChannelResponse>(KickService.CHANNEL_URL, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });
        return response.data.data;
    }

    /**
     * Suscribe a webhooks de chat de Kick
     * 
     * Método específico de Kick (no genérico)
     * Usado para recibir eventos de chat en tiempo real
     */
    static async subscribeToChat(accessToken: string, broadcasterUserId: string, callbackUrl: string) {
        try {
            logger.debug({ platform: 'kick', broadcasterUserId, callbackUrl }, 'Subscribing to Kick chat webhook');

            return await axios.post('https://api.kick.com/public/v1/events/subscriptions', {
                broadcaster_user_id: parseInt(broadcasterUserId),
                events: [{ name: 'chat.message.sent', version: 1 }],
                method: 'webhook',
                callback_url: callbackUrl
            }, {
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
        } catch (error) {
            logger.error({ err: error, platform: 'kick', broadcasterUserId }, 'Error subscribing to Kick chat webhook');
            throw error;
        }
    }

    /**
     * Envía un mensaje al chat de Kick
     * 
     * Método específico de Kick (no genérico)
     * Usado para enviar mensajes desde el dashboard del streamer
     * 
     * @param accessToken - Token de acceso OAuth del usuario
     * @param channelId - ID del canal de Kick
     * @param message - Mensaje a enviar
     * 
     * Validates: Requirements 7.1, 7.2
     */
    async sendChatMessage(accessToken: string, channelId: string, message: string): Promise<void> {
        try {
            logger.debug({ platform: 'kick', channelId, messageLength: message.length }, 'Sending message to Kick official API');

            await axios.post(
                'https://api.kick.com/public/v1/chat',
                {
                    content: message,
                    type: 'user',
                    broadcaster_user_id: parseInt(channelId)
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );

            logger.info({ platform: 'kick', channelId }, 'Message sent successfully to Kick');
        } catch (error: unknown) {
            // Manejar errores de API con mensajes descriptivos
            if (axios.isAxiosError(error)) {
                const status = error.response?.status;
                const errorData = error.response?.data as { message?: string } | undefined;

                if (status === 401) {
                    // Para 401, re-lanzar el error original de axios para que MessageSenderService 
                    // pueda detectarlo y ejecutar la lógica de retry con refresh de token
                    error.message = 'Token de acceso inválido o expirado';
                    throw error;
                } else if (status === 403) {
                    throw new Error('No tienes permisos para enviar mensajes en este canal. Verifica que tu cuenta esté verificada y no tenga restricciones.');
                } else if (status === 404) {
                    throw new Error('Canal de Kick no encontrado');
                } else if (status === 429) {
                    throw new Error('Límite de tasa excedido en Kick. Intenta de nuevo más tarde');
                } else {
                    throw new Error(
                        `Error de API de Kick: ${errorData?.message || error.message}`
                    );
                }
            }

            logger.error({ err: error, platform: 'kick', channelId }, 'Error sending message to Kick');
            throw error;
        }
    }
}

