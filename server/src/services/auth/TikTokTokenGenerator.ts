/**
 * Generador de Tokens de TikTok
 * Responsabilidad: Generar tokens placeholder para TikTok (Capa de Infraestructura)
 * 
 * TikTok no usa OAuth, por lo que generamos tokens placeholder
 * que son válidos para el sistema pero no para la API de TikTok.
 */

import { AuthTokens } from '../../types/index';

export class TikTokTokenGenerator {
    /**
     * Genera tokens placeholder para TikTok
     * 
     * TikTok no requiere OAuth, pero nuestro sistema espera tokens.
     * Generamos tokens placeholder únicos que:
     * - Son válidos para el sistema (no vacíos)
     * - No expiran (1 año)
     * - Son únicos por usuario y timestamp
     * 
     * @param username - Username de TikTok
     * @returns Tokens placeholder válidos para el sistema
     */
    generatePlaceholderTokens(username: string): AuthTokens {
        return {
            access_token: `tiktok_placeholder_${username}_${Date.now()}`,
            expires_in: 365 * 24 * 60 * 60 // 1 año (31,536,000 segundos)
        };
    }
}
