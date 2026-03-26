/** Servicio de verificación de firmas de webhooks de Kick con clave pública RSA-SHA256 */

import * as crypto from 'crypto';
import axios from 'axios';
import { KickApiResponse } from '../../../types/kick.types';
import { logger } from '../../../utils/logger';

export class KickWebhookService {
    private static publicKey: string | null = null;
    private static lastKeyFetch: number = 0;

    private static fetchPromise: Promise<string | null> | null = null;

    private static processedMessages = new Set<string>();
    private static readonly MAX_CACHE_SIZE = 1000;

    private static async getPublicKey(): Promise<string | null> {
        const now = Date.now();
        if (this.publicKey && (now - this.lastKeyFetch < 600000)) {
            return this.publicKey;
        }

        if (this.fetchPromise) {
            return this.fetchPromise;
        }

        this.fetchPromise = (async () => {
            try {
                const response = await axios.get<KickApiResponse<{ public_key: string }>>('https://api.kick.com/public/v1/public-key', { timeout: 10000 });
                this.publicKey = response.data.data.public_key;
                this.lastKeyFetch = Date.now();
                return this.publicKey;
            } catch (error) {
                logger.error({ err: error }, 'Error obteniendo clave pública de Kick');
                return null;
            } finally {
                this.fetchPromise = null;
            }
        })();

        return this.fetchPromise;
    }

    static async verifySignature(
        signature: string,
        messageId: string,
        timestamp: string,
        rawBody: string
    ): Promise<boolean> {
        const key = await this.getPublicKey();
        if (!key) {
            logger.error({}, 'No Kick public key available');
            return false;
        }
        if (!messageId || !timestamp || !rawBody) {
            logger.error({ messageId, timestamp }, 'Missing Kick webhook signature components');
            return false;
        }

        try {
            const signaturePayload = `${messageId}.${timestamp}.${rawBody}`;

            const verifier = crypto.createVerify('RSA-SHA256');
            verifier.update(signaturePayload);
            verifier.end();

            let isValid = verifier.verify(key, Buffer.from(signature, 'base64'));

            // Si no es válido, intentamos refrescar la llave una vez si no es muy reciente (evitar loop infinito)
            if (!isValid && (Date.now() - this.lastKeyFetch > 60000)) {
                logger.debug({ messageId }, 'Firma inválida, reintentando tras refrescar llave pública de Kick');
                this.publicKey = null; // Forzar refresco
                const newKey = await this.getPublicKey();
                if (newKey) {
                    const retryVerifier = crypto.createVerify('RSA-SHA256');
                    retryVerifier.update(signaturePayload);
                    retryVerifier.end();
                    isValid = retryVerifier.verify(newKey, Buffer.from(signature, 'base64'));
                }
            }

            logger.debug({ isValid, messageId }, 'Resultado de verificación de firma de Kick');
            return isValid;
        } catch (error) {
            logger.error({ err: error, messageId }, 'Error verificando firma de Kick');
            return false;
        }
    }

    static isDuplicate(messageId: string): boolean {
        if (!messageId) return false;

        if (this.processedMessages.has(messageId)) {
            logger.debug({ messageId }, 'Kick Webhooks: Mensaje duplicado ignorado');
            return true;
        }

        this.processedMessages.add(messageId);

        if (this.processedMessages.size > this.MAX_CACHE_SIZE) {
            const firstElement = this.processedMessages.values().next().value;
            if (firstElement !== undefined) {
                this.processedMessages.delete(firstElement);
            }
        }

        return false;
    }
}
