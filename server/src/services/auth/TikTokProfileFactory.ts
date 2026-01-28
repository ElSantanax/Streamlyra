/**
 * Fábrica de Perfiles de TikTok
 * Responsabilidad: Construir perfiles de plataforma para TikTok (Capa de Construcción de Datos)
 * 
 * Encapsula la lógica de cómo construir un perfil de TikTok,
 * separándola de la orquestación de autenticación.
 */

import { PlatformProfile } from '../../types/index';

export class TikTokProfileFactory {
    /**
     * Crea un perfil de plataforma para TikTok
     * @param cleanUsername - Username validado y limpio de TikTok
     * @returns Perfil de plataforma para TikTok
     */
    createProfile(cleanUsername: string): PlatformProfile {
        return {
            provider: 'tiktok',
            providerId: `tiktok_${cleanUsername}`,
            providerUsername: cleanUsername,
            displayName: cleanUsername,
            avatarUrl: '' // TikTok no proporciona avatar en autenticación por username
        };
    }
}
