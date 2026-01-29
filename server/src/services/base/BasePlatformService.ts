/** Servicio base para plataformas con métodos genéricos de autenticación OAuth */

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

export abstract class BasePlatformService {
    protected abstract readonly oauthOptions: OAuthExchangeOptions;
    protected abstract readonly platformName: Platform;

    async getProfileAndTokens(code: string, codeVerifier?: string): Promise<PlatformAuthResult> {
        try {
            logger.debug({ platform: this.platformName }, 'Exchanging OAuth code for tokens');

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

            const rawProfile = await this.fetchUserProfile(tokens.access_token);

            const profile = this.normalizePlatformProfile(rawProfile);

            logger.info({ platform: this.platformName, providerId: profile.providerId }, 'Profile obtained');

            return {
                profile,
                tokens
            };
        } catch (error: unknown) {
            logger.error({ err: error, platform: this.platformName }, 'Error getting profile and tokens');

            if (error instanceof AppError) {
                throw error;
            }

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

    protected abstract fetchUserProfile(accessToken: string): Promise<unknown>;

    protected abstract normalizePlatformProfile(rawProfile: unknown): PlatformProfile;
}
