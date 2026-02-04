/** Servicio de verificación de firmas de webhooks de Kick con clave pública RSA-SHA256 */

import * as crypto from 'crypto';
import axios from 'axios';
import { KickApiResponse } from '../../../types/kick.types';
import { logger } from '../../../utils/logger';

export class KickWebhookService {
    private static publicKey: string | null = null;
    private static lastKeyFetch: number = 0;

    private static async getPublicKey(): Promise<string | null> {
        const now = Date.now();
        if (this.publicKey && (now - this.lastKeyFetch < 3600000)) {
            return this.publicKey;
        }

        try {
            const response = await axios.get<KickApiResponse<{ public_key: string }>>('https://api.kick.com/public/v1/public-key', { timeout: 10000 });
            this.publicKey = response.data.data.public_key;
            this.lastKeyFetch = now;
            return this.publicKey;
        } catch (error) {
            logger.error({ err: error }, 'Error obteniendo clave pública de Kick');
            return null;
        }
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
            logger.debug(
                {
                    messageId,
                    timestamp,
                    payloadPart: signaturePayload.substring(0, 50) + '...'
                },
                'Verificando firma de Kick'
            );

            const verifier = crypto.createVerify('RSA-SHA256');
            verifier.update(signaturePayload);
            verifier.end();

            const isValid = verifier.verify(key, Buffer.from(signature, 'base64'));
            logger.info({ isValid, messageId }, 'Resultado de verificación de firma de Kick');
            return isValid;
        } catch (error) {
            logger.error({ err: error, messageId }, 'Error verificando firma de Kick');
            return false;
        }
    }


}
