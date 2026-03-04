import * as crypto from 'crypto';
import { TwitchWebhookService } from '../TwitchWebhookService';
import { TwitchWebhook } from '../../../../models/TwitchWebhook.model';
import { logger } from '../../../../utils/logger';

jest.mock('../../../../models/TwitchWebhook.model');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    }
}));

describe('TwitchWebhookService', () => {
    afterEach(() => {
        jest.clearAllMocks();
        // Limpiamos el Set protegido 'processedMessages' vía reflection
        (TwitchWebhookService as unknown as { processedMessages: Set<string> }).processedMessages.clear();
    });

    describe('verifySignature', () => {
        const secret = 'my-secret';
        const messageId = 'msg123';
        const timestamp = '2026-01-01T00:00:00.000Z';
        const rawBody = '{"test":true}';

        const generateValidSignature = () => {
            const hmac = crypto.createHmac('sha256', secret);
            hmac.update(messageId + timestamp + rawBody);
            return 'sha256=' + hmac.digest('hex');
        };

        it('debe retornar false si faltan parámetros clave', () => {
            const result = TwitchWebhookService.verifySignature('', messageId, timestamp, rawBody, 'sig');
            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalled();
        });

        it('debe retornar true para una firma válida', () => {
            const validSignature = generateValidSignature();
            const result = TwitchWebhookService.verifySignature(secret, messageId, timestamp, rawBody, validSignature);
            expect(result).toBe(true);
        });

        it('debe retornar false para una firma inválida', () => {
            const validSignature = generateValidSignature();
            const invalidSignature = validSignature.replace('e', 'f'); // Manipular un caracater hex
            const result = TwitchWebhookService.verifySignature(secret, messageId, timestamp, rawBody, invalidSignature);
            expect(result).toBe(false);
            expect(logger.warn).toHaveBeenCalledWith({ messageId }, 'Firma de Twitch EventSub INVÁLIDA');
        });

        it('debe capturar errores inesperados (ej. firma con formato inválido) y retornar false', () => {
            // Pasar un objeto inválido que pase los checks iniciales pero falle en Buffer.from
            const badSignature = { toString: () => { throw new Error('Forced Error'); } } as unknown as string;
            const result = TwitchWebhookService.verifySignature(secret, messageId, timestamp, rawBody, badSignature);
            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('isDuplicate', () => {
        it('debe retornar false para el primer mensaje', () => {
            expect(TwitchWebhookService.isDuplicate('msg1')).toBe(false);
        });

        it('debe retornar true para mensajes duplicados', () => {
            TwitchWebhookService.isDuplicate('msg1');
            expect(TwitchWebhookService.isDuplicate('msg1')).toBe(true);
            expect(logger.debug).toHaveBeenCalledWith({ messageId: 'msg1' }, 'Twitch Webhooks: Mensaje duplicado ignorado');
        });

        it('debe limitar el tamaño del caché', () => {
            // MAX_CACHE_SIZE es 1000
            for (let i = 0; i < 1001; i++) {
                TwitchWebhookService.isDuplicate(`msg-${i}`);
            }

            // Al ser 1001, msg-0 debió ser eliminado del set
            expect(TwitchWebhookService.isDuplicate('msg-0')).toBe(false);
            expect(TwitchWebhookService.isDuplicate('msg-1000')).toBe(true); // Ya fue procesado
        });
    });

    describe('handleVerification', () => {
        const broadcasterId = 'broadcaster123';
        const subscriptionId = 'sub123';
        const type = 'channel.follow';

        it('no debe hacer nada si falta el subscriptionId', async () => {
            await TwitchWebhookService.handleVerification(broadcasterId, '');
            expect(logger.error).toHaveBeenCalled();
            expect(TwitchWebhook.update).not.toHaveBeenCalled();
        });

        it('debe actualizar por subscriptionId y broadcasterId', async () => {
            (TwitchWebhook.update as jest.Mock).mockResolvedValue([1]); // 1 fila actualizada

            await TwitchWebhookService.handleVerification(broadcasterId, subscriptionId, type);

            expect(TwitchWebhook.update).toHaveBeenCalledTimes(1);
            expect(TwitchWebhook.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'enabled' }),
                { where: { subscriptionId, broadcasterId } }
            );
            expect(logger.info).toHaveBeenCalled();
        });

        it('debe intentar actualizar por type si no encuentra el subscriptionId (fallback)', async () => {
            (TwitchWebhook.update as jest.Mock)
                .mockResolvedValueOnce([0]) // Fallo en la primera
                .mockResolvedValueOnce([1]); // Éxito en fallback

            await TwitchWebhookService.handleVerification(broadcasterId, subscriptionId, type);

            expect(TwitchWebhook.update).toHaveBeenCalledTimes(2);
            expect(TwitchWebhook.update).toHaveBeenLastCalledWith(
                expect.objectContaining({ status: 'enabled', subscriptionId }),
                { where: { broadcasterId, type } }
            );
        });
    });

    describe('handleRevocation', () => {
        it('debe actualizar a status revoked considerando el subscriptionId', async () => {
            await TwitchWebhookService.handleRevocation('broadcaster123', 'revoked_test', 'sub123');
            expect(TwitchWebhook.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'revoked' }),
                { where: { broadcasterId: 'broadcaster123', subscriptionId: 'sub123' } }
            );
            expect(logger.warn).toHaveBeenCalled();
        });

        it('debe actualizar a status revoked sin considerar el subscriptionId', async () => {
            await TwitchWebhookService.handleRevocation('broadcaster123', 'revoked_test');
            expect(TwitchWebhook.update).toHaveBeenCalledWith(
                expect.objectContaining({ status: 'revoked' }),
                { where: { broadcasterId: 'broadcaster123' } }
            );
        });
    });

    describe('generateSecret', () => {
        it('debe generar un secreto aleatorio en hex corto (32 bytes = 64 chars)', () => {
            const secret = TwitchWebhookService.generateSecret();
            expect(secret).toBeDefined();
            expect(typeof secret).toBe('string');
            expect(secret.length).toBe(64);
        });
    });
});
