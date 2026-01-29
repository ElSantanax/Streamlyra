/** Servicio de verificación de firmas de webhooks de Kick con clave pública RSA-SHA256 */

import * as crypto from 'crypto';
import axios from 'axios';
import { KickApiResponse } from '../../types/kick.types';

export class KickWebhookService {
    private static publicKey: string | null = null;
    private static lastKeyFetch: number = 0;

    private static async getPublicKey(): Promise<string | null> {
        const now = Date.now();
        if (this.publicKey && (now - this.lastKeyFetch < 3600000)) {
            return this.publicKey;
        }

        try {
            const response = await axios.get<KickApiResponse<{ public_key: string }>>('https://api.kick.com/public/v1/public-key');
            this.publicKey = response.data.data.public_key;
            this.lastKeyFetch = now;
            return this.publicKey;
        } catch (error) {
            console.error('[KickWebhook] Error obteniendo clave pública:', error);
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
            console.error('[KickWebhook] No public key available');
            return false;
        }
        if (!messageId || !timestamp || !rawBody) {
            console.error('[KickWebhook] Missing signature components');
            return false;
        }

        try {
            const signaturePayload = `${messageId}.${timestamp}.${rawBody}`;
            console.log('[KickWebhook] Verificando firma con payload:', signaturePayload.substring(0, 50) + '...');

            const verifier = crypto.createVerify('RSA-SHA256');
            verifier.update(signaturePayload);
            verifier.end();

            const isValid = verifier.verify(key, Buffer.from(signature, 'base64'));
            console.log('[KickWebhook] Firma válida:', isValid);
            return isValid;
        } catch (error) {
            console.error('[KickWebhook] Error verificando firma:', error);
            return false;
        }
    }


}
