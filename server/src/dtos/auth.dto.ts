/**
 * DTOs de autenticación - Esquemas de validación para operaciones de autenticación
 */
import { z } from 'zod';
import { PLATFORMS } from '../constants/platforms';

const VALIDATION_MESSAGES = {
    CODE_REQUIRED: 'code es requerido',
    USERNAME_REQUIRED: 'username es requerido'
} as const;

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

export type Platform = typeof PLATFORMS[number];
export { PLATFORMS };
