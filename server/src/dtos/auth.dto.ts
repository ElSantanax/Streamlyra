import { z } from 'zod';

export const oauthCodeSchema = z.object({
    code: z.string().min(1, 'code es requerido'),
    code_verifier: z.string().optional()
});

export const tiktokSchema = z.object({
    username: z.string().min(1, 'username es requerido')
});

export const disconnectPlatformSchema = z.object({
    provider: z.enum(['twitch', 'youtube', 'kick', 'tiktok'])
});
