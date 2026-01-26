/**
 * DTOs para validación de datos de webhook
 */

import { z } from 'zod';

export const kickWebhookSchema = z.object({
    event: z.object({
        type: z.string(),
        id: z.string(),
        created_at: z.string()
    }),
    data: z.record(z.any())
});

export const webhookHeadersSchema = z.object({
    'kick-event-signature': z.string(),
    'kick-event-message-timestamp': z.string(),
    'kick-event-message-id': z.string()
});

export type KickWebhookDTO = z.infer<typeof kickWebhookSchema>;
export type WebhookHeadersDTO = z.infer<typeof webhookHeadersSchema>;
