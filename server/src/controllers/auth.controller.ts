import crypto from 'crypto';
import { Response } from 'express';
import { AuthService } from '../services/auth/AuthService';
import { AuthRequest } from '../middleware/auth.middleware';
import { AppError } from '../utils/AppError';
import { Platform } from '../constants/platforms';
import { config } from '../config';

/**
 * Controlador de autenticación - Maneja peticiones HTTP para autenticación de usuarios
 */
export class AuthController {
    constructor(private authService: AuthService) { }

    private setCsrfCookie(res: Response) {
        res.cookie('csrf_token', crypto.randomBytes(32).toString('hex'), {
            httpOnly: false,
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            domain: config.cookie.domain,
            path: '/',
            maxAge: config.cookie.maxAge,
        });
    }

    private async handleOAuthAuth(platform: Platform, req: AuthRequest, res: Response): Promise<void> {
        const { code, code_verifier } = req.body as { code: string; code_verifier?: string };
        const result = await this.authService.handleOAuthAuth(platform, code, code_verifier, req.user?.id);

        res.cookie('auth_token', result.token, {
            httpOnly: true,
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            domain: config.cookie.domain,
            path: '/',
            maxAge: config.cookie.maxAge
        });

        this.setCsrfCookie(res);


        const { token: _token, ...responseData } = result;
        res.json(responseData);
    }

    twitchAuth = async (req: AuthRequest, res: Response): Promise<void> => {
        await this.handleOAuthAuth('twitch', req, res);
    };

    youtubeAuth = async (req: AuthRequest, res: Response): Promise<void> => {
        await this.handleOAuthAuth('youtube', req, res);
    };

    kickAuth = async (req: AuthRequest, res: Response): Promise<void> => {
        await this.handleOAuthAuth('kick', req, res);
    };

    getMe = async (req: AuthRequest, res: Response): Promise<void> => {
        if (!req.user) {
            throw new AppError('No autorizado', 401);
        }

        const result = await this.authService.getUserProfile(req.user.id);
        if (!result) {
            throw new AppError('Usuario no encontrado', 404);
        }

        // Desactivar caché HTTP para evitar inconsistencias en acciones rápidas (conectar/desconectar)
        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Surrogate-Control", "no-store");

        res.json(result);
    };

    disconnectPlatform = async (req: AuthRequest, res: Response): Promise<void> => {
        const { provider } = req.body as { provider: Platform };

        if (!req.user) {
            throw new AppError('No autorizado', 401);
        }

        await this.authService.disconnectPlatform(req.user.id, provider);

        res.json({ success: true, message: `${provider} desconectado` });
    };

    tiktokAuth = async (req: AuthRequest, res: Response): Promise<void> => {
        const { username } = req.body as { username: string };

        if (!req.user) {
            throw new AppError('No autorizado', 401);
        }

        const result = await this.authService.handleTikTokAuth(username, req.user.id);

        res.cookie('auth_token', result.token, {
            httpOnly: true,
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            domain: config.cookie.domain,
            path: '/',
            maxAge: config.cookie.maxAge
        });

        this.setCsrfCookie(res);


        const { token: _token, ...responseData } = result;
        res.json(responseData);
    };

    logout = async (req: AuthRequest, res: Response): Promise<void> => {
        await this.authService.logout(req.user?.id);

        res.clearCookie('auth_token', {
            httpOnly: true,
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            domain: config.cookie.domain,
            path: '/'
        });

        res.clearCookie('csrf_token', {
            httpOnly: false,
            secure: config.cookie.secure,
            sameSite: config.cookie.sameSite,
            domain: config.cookie.domain,
            path: '/',
        });
        res.json({ success: true, message: 'Sesión cerrada exitosamente' });
    };

    regenerateOverlayToken = async (req: AuthRequest, res: Response): Promise<void> => {
        if (!req.user) {
            throw new AppError('No autorizado', 401);
        }

        const newToken = await this.authService.regenerateOverlayToken(req.user.id);
        res.json({ success: true, overlayToken: newToken });
    };
}
