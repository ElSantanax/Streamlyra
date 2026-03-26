import { KickWebhookService } from '../KickWebhookService';
import axios from 'axios';
import * as crypto from 'crypto';
import { logger } from '../../../../utils/logger';
import { KickApiResponse } from '../../../../types/kick.types';

jest.mock('axios');
jest.mock('crypto');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    }
}));

describe('KickWebhookService', () => {
    // Para interactuar con las variables estaticas en TypeScript sin usar any
    interface ExposedKickWebhookService {
        publicKey: string | null;
        lastKeyFetch: number;
        fetchPromise: Promise<string | null> | null;
        processedMessages: Set<string>;
        MAX_CACHE_SIZE: number;
    }

    const resetServiceState = () => {
        const svc = KickWebhookService as unknown as ExposedKickWebhookService;
        svc.publicKey = null;
        svc.lastKeyFetch = 0;
        svc.fetchPromise = null;
        svc.processedMessages.clear();
    };

    beforeEach(() => {
        jest.clearAllMocks();
        resetServiceState();
    });

    describe('verifySignature', () => {
        const signature = 'base64_sig';
        const messageId = 'msg-123';
        const timestamp = '1672531200';
        const rawBody = '{"event":"follow"}';
        const fakePublicKey = '-----BEGIN PUBLIC KEY-----...';

        it('debe solicitar la llave pública si no existe y retornarla cacheadas tras el primer fetch', async () => {
            (axios.get as jest.Mock).mockResolvedValueOnce({
                data: { data: { public_key: fakePublicKey } } as KickApiResponse<{ public_key: string }>
            });

            // Simulamos Verify de crypto
            const mockVerifyObject = {
                update: jest.fn(),
                end: jest.fn(),
                verify: jest.fn().mockReturnValue(true)
            };
            (crypto.createVerify as jest.Mock).mockReturnValue(mockVerifyObject);

            const result = await KickWebhookService.verifySignature(signature, messageId, timestamp, rawBody);
            expect(result).toBe(true);

            expect(axios.get).toHaveBeenCalledTimes(1);

            // Segundo llamado debería usar el caché
            const result2 = await KickWebhookService.verifySignature(signature, messageId, timestamp, rawBody);
            expect(result2).toBe(true);

            expect(axios.get).toHaveBeenCalledTimes(1); // Mismo número, uso caché
        });

        it('debe rechazar verificacion si no hay key_publica tras intentar consultarla', async () => {
            (axios.get as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
            const result = await KickWebhookService.verifySignature(signature, messageId, timestamp, rawBody);
            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith({}, 'No Kick public key available');
        });

        it('debe rechazar verificacion si faltan parametros obligatorios', async () => {
            (axios.get as jest.Mock).mockResolvedValueOnce({
                data: { data: { public_key: fakePublicKey } }
            });

            const result = await KickWebhookService.verifySignature('', '', timestamp, rawBody);
            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({ timestamp }),
                'Missing Kick webhook signature components'
            );
        });

        it('debe invalidar firma si crypto.verify lo rechaza, e intentar un refresco (retry)', async () => {
            (axios.get as jest.Mock)
                .mockResolvedValueOnce({ data: { data: { public_key: 'old_key' } } }) // Para primera
                .mockResolvedValueOnce({ data: { data: { public_key: 'new_key' } } }); // Para el retry

            const mockVerifyObject = {
                update: jest.fn(),
                end: jest.fn(),
                // Retorna false primera vez, true segunda vez
                verify: jest.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)
            };
            (crypto.createVerify as jest.Mock).mockReturnValue(mockVerifyObject);

            // Pre-fetch public key before manipulating cache
            const svc = KickWebhookService as unknown as ExposedKickWebhookService;
            const initialFetchPromise = (KickWebhookService as unknown as { getPublicKey: () => Promise<string | null> }).getPublicKey();
            await initialFetchPromise;
            svc.lastKeyFetch = Date.now() - 70000; // Lo volvemos 'obsoleto' para el catch/retry clause

            const finalResult = await KickWebhookService.verifySignature(signature, messageId, timestamp, rawBody);

            expect(finalResult).toBe(true);
            expect(mockVerifyObject.verify).toHaveBeenCalledTimes(2);
            expect(logger.debug).toHaveBeenCalledWith(
                expect.objectContaining({ messageId }),
                'Firma inválida, reintentando tras refrescar llave pública de Kick'
            );
        });

        it('debe atrapar errores en la verificación criptográfica y retornar false', async () => {
            (axios.get as jest.Mock).mockResolvedValueOnce({
                data: { data: { public_key: fakePublicKey } }
            });

            const mockVerifyObject = {
                update: jest.fn(),
                end: jest.fn(),
                verify: jest.fn().mockImplementation(() => { throw new Error('Crypto error'); })
            };
            (crypto.createVerify as jest.Mock).mockReturnValue(mockVerifyObject);

            const result = await KickWebhookService.verifySignature(signature, messageId, timestamp, rawBody);

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                expect.objectContaining({ messageId }),
                'Error verificando firma de Kick'
            );
        });
    });

    describe('isDuplicate', () => {
        const messageId = 'msg-123';

        it('debe retornar false la primera vez que procesa un ID', () => {
            const result = KickWebhookService.isDuplicate(messageId);
            expect(result).toBe(false);
        });

        it('debe retornar true si el ID ya fue procesado', () => {
            KickWebhookService.isDuplicate(messageId);
            const result = KickWebhookService.isDuplicate(messageId);
            expect(result).toBe(true);
            expect(logger.debug).toHaveBeenCalledWith(
                { messageId },
                'Kick Webhooks: Mensaje duplicado ignorado'
            );
        });

        it('debe limitar el tamaño del caché a MAX_CACHE_SIZE y eliminar los más viejos (FIFO)', () => {
            const svc = KickWebhookService as unknown as ExposedKickWebhookService;
            const MAX_SIZE = svc.MAX_CACHE_SIZE;

            for (let i = 0; i < MAX_SIZE; i++) {
                KickWebhookService.isDuplicate(`msg-${i}`);
            }

            expect(KickWebhookService.isDuplicate('msg-0')).toBe(true);

            KickWebhookService.isDuplicate('msg-new');

            expect(KickWebhookService.isDuplicate('msg-0')).toBe(false);
        });

        it('debe manejar messageId vacío retornando false', () => {
            const result = KickWebhookService.isDuplicate('');
            expect(result).toBe(false);
        });
    });
});
