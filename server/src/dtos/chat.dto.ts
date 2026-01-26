/**
 * DTOs para validación de datos de chat
 */

import { z } from 'zod';
import { PLATFORMS } from '../constants/platforms';

export const chatMessageSchema = z.object({
    id: z.string(),
    platform: z.enum(PLATFORMS),
    user: z.string(),
    message: z.string(),
    time: z.string(),
    avatar: z.string().optional(),
    isMod: z.boolean().optional(),
    isSub: z.boolean().optional(),
    isOwner: z.boolean().optional(),
    specialMessage: z.string().optional(),
    isSpecial: z.boolean().optional()
});

export const connectionStatusSchema = z.object({
    platform: z.enum(PLATFORMS),
    status: z.enum(['connecting', 'connected', 'disconnected', 'error']),
    message: z.string().optional()
});

export const viewersUpdateSchema = z.object({
    platform: z.enum(PLATFORMS),
    count: z.number().int().min(0)
});

export type ChatMessageDTO = z.infer<typeof chatMessageSchema>;
export type ConnectionStatusDTO = z.infer<typeof connectionStatusSchema>;
export type ViewersUpdateDTO = z.infer<typeof viewersUpdateSchema>;
