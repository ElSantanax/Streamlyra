/**
 * Factory para crear instancias de servicios OAuth de plataformas
 * Centraliza la creación y gestión de servicios OAuth
 * 
 * Responsabilidad: Proporcionar el servicio correcto según la plataforma
 */

import { TwitchService } from './TwitchService';
import { YouTubeService } from './YouTubeService';
import { KickService } from './KickService';
import { OAuthService } from '../../types/auth.types';
import { Platform } from '../../constants/platforms';
import { AppError } from '../../utils/AppError';

export class PlatformServiceFactory {
    private static readonly OAUTH_SERVICES: Record<string, OAuthService> = {
        twitch: new TwitchService(),
        youtube: new YouTubeService(),
        kick: new KickService()
    };

    /**
     * Obtiene el servicio OAuth para una plataforma
     * @param platform - Plataforma (twitch, youtube, kick)
     * @returns Servicio OAuth de la plataforma
     * @throws AppError si la plataforma no es soportada
     */
    static getService(platform: Platform): OAuthService {
        const service = this.OAUTH_SERVICES[platform];
        
        if (!service) {
            throw new AppError(`Platform ${platform} is not supported for OAuth`, 400);
        }

        return service;
    }

    /**
     * Verifica si una plataforma soporta OAuth
     * @param platform - Plataforma a verificar
     * @returns true si la plataforma soporta OAuth
     */
    static supportsOAuth(platform: Platform): boolean {
        return platform in this.OAUTH_SERVICES;
    }
}
