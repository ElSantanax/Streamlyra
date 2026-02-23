import crypto from 'crypto';
import { config } from '../../config';
import { AppError } from '../../utils/AppError';
import { logger } from '../../utils/logger';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;

const ENCRYPTED_PATTERN = /^[0-9a-fA-F]{32}:[0-9a-fA-F]{32}:[0-9a-fA-F]*$/;

export class EncryptionService {
    private readonly key: Buffer;

    constructor() {
        this.key = Buffer.from(config.encryptionKey, 'hex');
    }

    public encrypt(text: string): string {
        if (!text) return text;

        try {
            const iv = crypto.randomBytes(IV_LENGTH);
            const cipher = crypto.createCipheriv(ALGORITHM, this.key, iv);

            let encrypted = cipher.update(text, 'utf8', 'hex');
            encrypted += cipher.final('hex');

            const authTag = cipher.getAuthTag();

            return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
        } catch {
            throw new AppError('Error encrypting data', 500);
        }
    }

    public isEncrypted(text: string): boolean {
        if (!text) return false;
        return ENCRYPTED_PATTERN.test(text);
    }

    public decrypt(text: string, context?: string): string {
        if (!text) return text;

        if (!this.isEncrypted(text)) {
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
            logger.error({ err: error }, 'Decryption failed for sensitive data');
            throw new AppError('Error decrypting data', 500);
        }
    }
}

export const encryptionService = new EncryptionService();
export default encryptionService;