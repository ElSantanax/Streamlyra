import { Response } from 'express';
import { User } from '../models/User.model';
import { Connection } from '../models/Connection.model';
import { AuthService } from '../services/AuthService';
import { TwitchService } from '../services/platforms/TwitchService';
import { YouTubeService } from '../services/platforms/YouTubeService';
import { AuthRequest } from '../middleware/auth.middleware';

export const twitchAuth = async (req: AuthRequest, res: Response): Promise<void> => {
    const { code } = req.body as { code?: string };
    if (!code) {
        res.status(400).json({ error: 'Falta el código de autorización' });
        return;
    }

    try {
        const { profile, tokens } = await TwitchService.getProfileAndTokens(code);
        const result = await AuthService.handlePlatformAuth(profile, tokens, req.user?.id);
        res.json(result);
    } catch (error: unknown) {
        const err = error as Error;
        console.error('Error Twitch Auth:', err.message);
        res.status(400).json({ error: err.message });
    }
};

export const youtubeAuth = async (req: AuthRequest, res: Response): Promise<void> => {
    const { code } = req.body as { code?: string };
    if (!code) {
        res.status(400).json({ error: 'Falta el código de autorización' });
        return;
    }

    try {
        const { profile, tokens } = await YouTubeService.getProfileAndTokens(code);
        const result = await AuthService.handlePlatformAuth(profile, tokens, req.user?.id);
        res.json(result);
    } catch (error: unknown) {
        const err = error as Error;
        console.error('Error YouTube Auth:', err.message);
        res.status(400).json({ error: err.message });
    }
};

export const getMe = async (req: AuthRequest, res: Response): Promise<void> => {
    if (!req.user) {
        res.status(401).json({ error: 'No autorizado' });
        return;
    }

    try {
        const user = await User.findByPk(req.user.id, {
            include: [{ model: Connection, attributes: ['provider', 'providerUsername'] }]
        });

        if (!user) {
            res.status(404).json({ error: 'Usuario no encontrado' });
            return;
        }

        interface ConnectionInfo {
            connected: boolean;
            username?: string;
        }

        const connections = user.connections.reduce((acc: Record<string, ConnectionInfo>, conn) => {
            acc[conn.provider] = {
                connected: true,
                username: conn.providerUsername
            };
            return acc;
        }, {
            twitch: { connected: false },
            youtube: { connected: false },
            kick: { connected: false },
            tiktok: { connected: false }
        });

        res.json({
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatarUrl
            },
            connections
        });
    } catch {
        res.status(500).json({ error: 'Error del servidor' });
    }
};

export const disconnectPlatform = async (req: AuthRequest, res: Response): Promise<void> => {
    const { provider } = req.body as { provider?: string };
    if (!req.user || !provider) {
        res.status(400).json({ error: 'Faltan datos requeridos' });
        return;
    }

    try {
        await Connection.destroy({ where: { userId: req.user.id, provider } });
        res.json({ success: true, message: `${provider} desconectado` });
    } catch {
        res.status(500).json({ error: 'Error al desconectar' });
    }
};


