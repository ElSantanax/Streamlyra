import { Response } from 'express';
import { AuthService } from '../services/AuthService';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../utils/AppError';
import { Platform } from '../constants/platforms';

/**
 * Controlador de autenticación
 * Responsabilidad: Manejar peticiones/respuestas HTTP
 * Lógica de negocio delegada a AuthService
 */
export class AuthController {
    constructor(private authService: AuthService) {}

    /**
     * Maneja autenticación OAuth genérica para cualquier plataforma
     * 
     * Flujo:
     * 1. Extraer código y code_verifier del body
     * 2. Delegar a AuthService
     * 3. Retornar resultado
     */
    private async handleOAuthAuth(platform: Platform, req: AuthRequest, res: Response): Promise<void> {
        const { code, code_verifier } = req.body as { code: string; code_verifier?: string };
        const result = await this.authService.handleOAuthAuth(platform, code, code_verifier, req.user?.id);
        res.json(result);
    }

    /**
     * Autentica con Twitch
     */
    twitchAuth = async (req: AuthRequest, res: Response): Promise<void> => {
        await this.handleOAuthAuth('twitch', req, res);
    };

    /**
     * Autentica con YouTube
     */
    youtubeAuth = async (req: AuthRequest, res: Response): Promise<void> => {
        await this.handleOAuthAuth('youtube', req, res);
    };

    /**
     * Autentica con Kick
     */
    kickAuth = async (req: AuthRequest, res: Response): Promise<void> => {
        await this.handleOAuthAuth('kick', req, res);
    };

    /**
     * Obtiene el perfil del usuario autenticado
     */
    getMe = async (req: AuthRequest, res: Response): Promise<void> => {
        if (!req.user) {
            throw new AppError('No autorizado', 401);
        }

        const result = await this.authService.getUserProfile(req.user.id);
        if (!result) {
            throw new AppError('Usuario no encontrado', 404);
        }

        res.json(result);
    };

    /**
     * Desconecta una plataforma
     */
    disconnectPlatform = async (req: AuthRequest, res: Response): Promise<void> => {
        const { provider } = req.body as { provider: Platform };

        if (!req.user) {
            throw new AppError('No autorizado', 401);
        }

        await this.authService.disconnectPlatform(req.user.id, provider);
        res.json({ success: true, message: `${provider} desconectado` });
    };

    /**
     * Autentica con TikTok (basado en username)
     */
    tiktokAuth = async (req: AuthRequest, res: Response): Promise<void> => {
        const { username } = req.body as { username: string };

        if (!req.user) {
            throw new AppError('No autorizado', 401);
        }

        const result = await this.authService.handleTikTokAuth(username, req.user.id);
        res.json(result);
    };
}
