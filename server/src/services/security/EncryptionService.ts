/**
 * Servicio de encriptación de datos sensibles usando AES-256-GCM.
 * Formato de salida: iv:authTag:encryptedData (hex)
 */
import crypto from 'crypto';
import { config } from '../../config';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16; // Para AES, siempre son 16 bytes

export class EncryptionService {
    private readonly key: Buffer;

    constructor() {
        // La key ya viene validada como 64 chars hex string (32 bytes)
        this.key = Buffer.from(config.encryptionKey, 'hex');
    }

    /**
     * Encripta un texto plano
     */
    public encrypt(text: string): string {
        if (!text) return text;

        try {
            const iv = crypto.randomBytes(IV_LENGTH);
            const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const authTag = cipher.getAuthTag();

            // Formato: IV:AuthTag:EncryptedData
            return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
        } catch {
            throw new AppError('Error encrypting data', 500);
        }
    }

    /**
     * Verifica si una cadena sigue el formato de cifrado esperado (iv:tag:data)
     */
    public isEncrypted(text: string): boolean {
        if (!text) return false;
        return text.split(':').length === 3;
    }

    /**
     * Desencripta un texto cifrado
     * Retorna el texto tal cual si no parece estar encriptado (migración suave)
     */
    public decrypt(text: string, context?: string): string {
        if (!text) return text;

        if (!this.isEncrypted(text)) {
            // Asumir que es texto plano (legacy)
            logger.warn(
                { textLength: text.length, context },
                'Detected legacy unencrypted data. Please update to encrypted format.'
            );
            return text;
        }

        try {
            const [ivHex, authTagHex, encryptedHex] = text.split(':');

            const iv = Buffer.from(ivHex, 'hex');
            const authTag = Buffer.from(authTagHex, 'hex');
            const decipher = crypto.createDecipheriv(ALGORITHM, this.key, iv);

            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
            decrypted += decipher.final('utf8');

            return decrypted;
        } catch (error) {
            // Si falla la desencriptación (ej: clave incorrecta o datos corruptos)
            // No podemos devolver el texto original porque está cifrado.
            logger.error({ err: error }, 'Decryption failed for sensitive data');
            throw new AppError('Error decrypting data', 500);
        }
    }
}
