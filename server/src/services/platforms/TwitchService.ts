import axios from 'axios';
import { BasePlatformService, PlatformProfile } from '../base/BasePlatformService';
import { TwitchUserResponse } from '../../types/twitch.types';
import { config } from '../../config';
import { OAuthExchangeOptions } from '../../utils/oauth.utils';

interface TwitchUser {
    id: string;
    login: string;
    display_name: string;
    profile_image_url: string;
    email?: string;
}

/**
 * Servicio de Twitch
 * Responsabilidad: Autenticación OAuth específica de Twitch
 * 
 * Hereda métodos genéricos de BasePlatformService:
 * - getProfileAndTokens(code, codeVerifier)
 * - refreshAccessToken(refreshToken)
 * 
 * Implementa métodos específicos de Twitch:
 * - fetchUserProfile(accessToken)
 * - normalizePlatformProfile(twitchUser)
 */
import { Platform } from '../../constants/platforms';

export class TwitchService extends BasePlatformService {
    protected readonly platformName: Platform = 'twitch';

    protected readonly oauthOptions: OAuthExchangeOptions = {
        baseUrl: 'https://id.twitch.tv/oauth2/token',
        clientId: config.twitch.clientId!,
        clientSecret: config.twitch.clientSecret!,
        redirectUri: config.twitch.redirectUri!
    };

    /**
     * Obtiene perfil del usuario desde la API de Twitch
     * 
     * Endpoint: GET https://api.twitch.tv/helix/users
     * Retorna: Array con 1 usuario
     */
    protected async fetchUserProfile(accessToken: string): Promise<TwitchUser> {
        const userResponse = await axios.get<TwitchUserResponse>('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': config.twitch.clientId!,
                'Authorization': `Bearer ${accessToken}`
            }
        });

        return userResponse.data.data[0];
    }

    /**
     * Normaliza perfil de Twitch al formato común
     */
    protected normalizePlatformProfile(twitchUser: TwitchUser): PlatformProfile {
        return {
            provider: 'twitch',
            providerId: twitchUser.id,
            providerUsername: twitchUser.login,
            displayName: twitchUser.display_name,
            avatarUrl: twitchUser.profile_image_url,
            email: twitchUser.email
        };
    }

    /**
     * Envía un mensaje al chat de Twitch
     * 
     * @param accessToken - Token de acceso del usuario
     * @param broadcasterId - ID del canal (broadcaster)
     * @param senderId - ID del usuario que envía el mensaje
     * @param message - Mensaje a enviar
     * 
     * Endpoint: POST https://api.twitch.tv/helix/chat/messages
     * Requirements: 5.1, 5.2
     */
    async sendChatMessage(
        accessToken: string,
        broadcasterId: string,
        senderId: string,
        message: string
    ): Promise<void> {
        try {
            const response = await axios.post(
                'https://api.twitch.tv/helix/chat/messages',
                {
                    broadcaster_id: broadcasterId,
                    sender_id: senderId,
                    message: message
                },
                {
                    headers: {
                        'Authorization': `Bearer ${accessToken}`,
                        'Client-ID': config.twitch.clientId!,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.status !== 200) {
                throw new Error(`Twitch API error: ${response.statusText}`);
            }
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
                    throw new Error('No tienes permisos para enviar mensajes en este canal');
                } else if (status === 422) {
                    throw new Error('El mensaje no cumple con los requisitos de Twitch');
                } else if (status === 429) {
                    throw new Error('Límite de tasa excedido. Intenta de nuevo más tarde');
                } else {
                    throw new Error(
                        `Error de API de Twitch: ${errorData?.message || error.message}`
                    );
                }
            }
            throw error;
        }
    }
}
