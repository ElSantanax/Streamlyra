/**
 * Servicio Base para Plataformas
 * Responsabilidad: Proporcionar métodos genéricos para autenticación OAuth
 * 
 * Cada plataforma (Twitch, YouTube, Kick) extiende esta clase
 * y solo implementa métodos específicos de su API
 */

import { OAuthUtils, OAuthExchangeOptions } from '../../utils/oauth.utils';
import { logger } from '../../utils/logger';
import { AuthTokens, PlatformProfile } from '../../types/index';
import { AppError } from '../../utils/AppError';
export { AuthTokens, PlatformProfile };
import { Platform } from '../../constants/platforms';

export interface PlatformAuthResult {
    profile: PlatformProfile;
    tokens: AuthTokens;
}

/**
 * Clase base abstracta para servicios de plataformas
 * 
 * Métodos genéricos:
 * - getProfileAndTokens(code) - Intercambia código por tokens y perfil
 * - refreshAccessToken(refreshToken) - Refresca token de acceso
 * 
 * Métodos abstractos (implementar en subclases):
 * - fetchUserProfile(accessToken) - Obtiene perfil del usuario
 * - normalizePlatformProfile(rawProfile) - Normaliza perfil a formato común
 */
export abstract class BasePlatformService {
    protected abstract readonly oauthOptions: OAuthExchangeOptions;
    protected abstract readonly platformName: Platform;

    /**
     * Obtiene perfil y tokens intercambiando código OAuth
     * 
     * Flujo:
     * 1. Intercambiar código por tokens
     * 2. Obtener perfil del usuario
     * 3. Normalizar perfil
     * 4. Retornar resultado
     */
    async getProfileAndTokens(code: string, codeVerifier?: string): Promise<PlatformAuthResult> {
        try {
            logger.debug({ platform: this.platformName }, 'Exchanging OAuth code for tokens');

            // Intercambiar código por tokens
            const extraParams: Record<string, string> = {};
            if (codeVerifier) {
                extraParams.code_verifier = codeVerifier;
            }

            const tokens = await OAuthUtils.exchangeCode<AuthTokens>(
                code,
                this.oauthOptions,
                extraParams
            );

            logger.debug({ platform: this.platformName }, 'Tokens obtained, fetching user profile');

            // Obtener perfil del usuario
            const rawProfile = await this.fetchUserProfile(tokens.access_token);

            // Normalizar perfil
            const profile = this.normalizePlatformProfile(rawProfile);

            logger.info({ platform: this.platformName, providerId: profile.providerId }, 'Profile obtained');

            return {
                profile,
                tokens
            };
        } catch (error: unknown) {
            logger.error({ err: error, platform: this.platformName }, 'Error getting profile and tokens');

            // Mejorar mensajes de error de OAuth
            if (error && typeof error === 'object' && 'response' in error) {
                const axiosError = error as { response?: { status?: number } };
                if (axiosError.response?.status === 400) {
                    throw new AppError(`Error de autorización de ${this.platformName}. Por favor, intenta conectar la cuenta nuevamente.`, 400);
                }
                if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
                    throw new AppError(`Permisos insuficientes para ${this.platformName}. Asegúrate de autorizar todos los permisos solicitados.`, 403);
                }
            }

            throw new AppError(`Error al conectar con ${this.platformName}. Intenta nuevamente.`, 500);
        }
    }

    /**
     * Refresca el token de acceso usando el refresh token
     * 
     * Flujo:
     * 1. Usar refresh token para obtener nuevo access token
     * 2. Retornar nuevos tokens
     */
    async refreshAccessToken(refreshToken: string): Promise<AuthTokens> {
        try {
            logger.debug({ platform: this.platformName }, 'Refreshing access token');

            const tokens = await OAuthUtils.refreshTokens<AuthTokens>(
                refreshToken,
                this.oauthOptions
            );

            logger.debug({ platform: this.platformName }, 'Access token refreshed');

            return {
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token || refreshToken,
                expires_in: tokens.expires_in
            };
        } catch (error) {
            logger.error({ err: error, platform: this.platformName }, 'Error refreshing access token');
            throw error;
        }
    }

    /**
     * Método abstracto: Obtener perfil del usuario desde la API de la plataforma
     * 
     * Cada plataforma implementa esto según su API
     */
    protected abstract fetchUserProfile(accessToken: string): Promise<unknown>;

    /**
     * Método abstracto: Normalizar perfil de la plataforma al formato común
     * 
     * Cada plataforma implementa esto según su estructura de datos
     */
    protected abstract normalizePlatformProfile(rawProfile: unknown): PlatformProfile;
}
