import axios from 'axios';
import { BasePlatformService, PlatformProfile } from '../base/BasePlatformService';
import { YouTubeChannelResponse } from '../../types/youtube.types';
import { config } from '../../config';
import { OAuthExchangeOptions } from '../../utils/oauth.utils';
import { logger } from '../../utils/logger';
import { AppError } from '../../utils/AppError';

interface YouTubeChannel {
    id: string;
    snippet: {
        title: string;
        thumbnails?: {
            default?: {
                url: string;
            };
        };
    };
}

/**
 * Servicio de YouTube
 * Responsabilidad: Autenticación OAuth específica de YouTube
 * 
 * Hereda métodos genéricos de BasePlatformService:
 * - getProfileAndTokens(code, codeVerifier)
 * - refreshAccessToken(refreshToken)
 * 
 * Implementa métodos específicos de YouTube:
 * - fetchUserProfile(accessToken)
 * - normalizePlatformProfile(channel)
 * 
 * NOTA: YouTube tiene estructura diferente:
 * - Retorna array de canales (items)
 * - Requiere validación de que items no esté vacío
 * - Genera providerUsername a partir del título
 */
import { Platform } from '../../constants/platforms';

export class YouTubeService extends BasePlatformService {
    protected readonly platformName: Platform = 'youtube';

    protected readonly oauthOptions: OAuthExchangeOptions = {
        baseUrl: 'https://oauth2.googleapis.com/token',
        clientId: config.youtube.clientId!,
        clientSecret: config.youtube.clientSecret!,
        redirectUri: config.youtube.redirectUri!
    };

    /**
     * Obtiene perfil del usuario desde la API de YouTube
     * 
     * Endpoint: GET https://www.googleapis.com/youtube/v3/channels
     * Parámetros: part=snippet, mine=true
     * Retorna: Array de canales (items)
     * 
     * IMPORTANTE: YouTube requiere validación de que items no esté vacío
     */
    protected async fetchUserProfile(accessToken: string): Promise<YouTubeChannel> {
        try {
            logger.debug({ platform: this.platformName }, 'Fetching YouTube user profile');
            
            const userResponse = await axios.get<YouTubeChannelResponse>(
                'https://www.googleapis.com/youtube/v3/channels',
                {
                    params: { part: 'snippet', mine: true },
                    headers: { Authorization: `Bearer ${accessToken}` }
                }
            );

            const items = userResponse.data.items;

            if (!items || items.length === 0) {
                logger.error({ platform: this.platformName }, 'No YouTube channel found');
                throw new Error('No se encontró canal de YouTube asociado.');
            }

            logger.debug({ platform: this.platformName, channelId: items[0].id }, 'YouTube profile fetched successfully');
            return items[0];
        } catch (error: unknown) {
            // Detectar error de cuota agotada de YouTube
            if (axios.isAxiosError(error) && error.response?.status === 403) {
                const errorData = error.response.data as { error?: { message?: string; errors?: Array<{ reason?: string }> } };
                const isQuotaError = errorData?.error?.errors?.some(e => e.reason === 'quotaExceeded');
                
                if (isQuotaError) {
                    logger.warn(
                        { 
                            platform: this.platformName,
                            message: '⚠️  CUOTA DE YOUTUBE AGOTADA - El usuario debe esperar hasta que se renueve la cuota diaria'
                        }, 
                        '⚠️  YouTube API quota exceeded during authentication'
                    );
                    throw new AppError(
                        '⚠️ La cuota de YouTube está temporalmente agotada. Por favor, intenta conectar tu cuenta más tarde (la cuota se renueva diariamente).',
                        503
                    );
                }
            }

            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            const axiosError = error && typeof error === 'object' && 'response' in error 
                ? error as { response?: { status?: number; data?: unknown } }
                : undefined;

            logger.error({ 
                platform: this.platformName, 
                error: errorMessage,
                status: axiosError?.response?.status,
                data: axiosError?.response?.data 
            }, 'Error fetching YouTube profile');
            throw error;
        }
    }

    /**
     * Normaliza perfil de YouTube al formato común
     * 
     * NOTA: YouTube no proporciona username, se genera a partir del título
     * - Elimina espacios
     * - Convierte a minúsculas
     * - Limita a 15 caracteres
     */
    protected normalizePlatformProfile(channel: YouTubeChannel): PlatformProfile {
        return {
            provider: 'youtube',
            providerId: channel.id,
            providerUsername: channel.snippet.title
                .replace(/\s+/g, '')
                .toLowerCase()
                .substring(0, 15),
            displayName: channel.snippet.title,
            avatarUrl: channel.snippet.thumbnails?.default?.url || ''
        };
    }
}
