import { z } from 'zod';
import { PLATFORMS } from '../constants/platforms';

// Constantes centralizadas
const VALIDATION_MESSAGES = {
    CODE_REQUIRED: 'code es requerido',
    USERNAME_REQUIRED: 'username es requerido'
} as const;

// Schemas - Usar PLATFORMS constante centralizada
export const oauthCodeSchema = z.object({
    code: z.string().min(1, VALIDATION_MESSAGES.CODE_REQUIRED),
    code_verifier: z.string().optional()
});

export const tiktokSchema = z.object({
    username: z.string().min(1, VALIDATION_MESSAGES.USERNAME_REQUIRED)
});

export const disconnectPlatformSchema = z.object({
    provider: z.enum(PLATFORMS)
});

// Exportar constantes para uso en otros archivos
export type Platform = typeof PLATFORMS[number];
export { PLATFORMS };
