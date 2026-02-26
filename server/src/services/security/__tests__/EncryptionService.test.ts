import { EncryptionService } from '../EncryptionService';
import { AppError } from '../../../utils/AppError';
import crypto from 'crypto';

jest.mock('../../../config', () => ({
    config: {
        encryptionKey: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    }
}));

jest.mock('../../../utils/logger', () => ({
    logger: {
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('EncryptionService', () => {
    let service: EncryptionService;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new EncryptionService();
    });

    describe('encrypt', () => {
        it('debe cifrar texto correctamente y retornar formato válido', () => {
            const plainText = 'sensitive-data-123';

            const encrypted = service.encrypt(plainText);

            expect(encrypted).toMatch(/^[0-9a-fA-F]{32}:[0-9a-fA-F]{32}:[0-9a-fA-F]+$/);
            expect(encrypted).not.toBe(plainText);
        });

        it('debe retornar texto vacío cuando input es vacío', () => {
            const result = service.encrypt('');

            expect(result).toBe('');
        });

        it('debe generar diferentes valores cifrados para el mismo texto', () => {
            const plainText = 'same-text';

            const encrypted1 = service.encrypt(plainText);
            const encrypted2 = service.encrypt(plainText);

            expect(encrypted1).not.toBe(encrypted2);
        });

        it('debe lanzar AppError cuando falla el cifrado', () => {
            const originalRandomBytes = crypto.randomBytes;
            crypto.randomBytes = jest.fn().mockImplementationOnce(() => {
                throw new Error('Crypto error');
            }) as typeof crypto.randomBytes;

            expect(() => service.encrypt('test')).toThrow(AppError);
            expect(() => service.encrypt('test')).toThrow('Error encrypting data');

            crypto.randomBytes = originalRandomBytes;
        });
    });

    describe('decrypt', () => {
        it('debe descifrar correctamente texto cifrado', () => {
            const plainText = 'my-secret-token';

            const encrypted = service.encrypt(plainText);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(plainText);
        });

        it('debe retornar texto vacío cuando input es vacío', () => {
            const result = service.decrypt('');

            expect(result).toBe('');
        });

        it('debe retornar texto sin cifrar cuando detecta formato legacy', () => {
            const legacyText = 'unencrypted-legacy-token';

            const result = service.decrypt(legacyText);

            expect(result).toBe(legacyText);
        });

        it('debe lanzar AppError cuando falla el descifrado con datos corruptos', () => {
            const plainText = 'test-data';
            const encrypted = service.encrypt(plainText);
            const [iv, authTag] = encrypted.split(':');
            const corruptedEncrypted = `${iv}:${authTag}:${'ff'.repeat(50)}`;

            expect(() => service.decrypt(corruptedEncrypted)).toThrow(AppError);
            expect(() => service.decrypt(corruptedEncrypted)).toThrow('Error decrypting data');
        });

        it('debe lanzar AppError cuando authTag es inválido', () => {
            const plainText = 'test-data';
            const encrypted = service.encrypt(plainText);
            const [iv, , encryptedData] = encrypted.split(':');
            const tamperedEncrypted = `${iv}:${'0'.repeat(32)}:${encryptedData}`;

            expect(() => service.decrypt(tamperedEncrypted)).toThrow(AppError);
        });
    });

    describe('isEncrypted', () => {
        it('debe retornar true para texto con formato cifrado válido', () => {
            const plainText = 'test-data';
            const encrypted = service.encrypt(plainText);

            const result = service.isEncrypted(encrypted);

            expect(result).toBe(true);
        });

        it('debe retornar false para texto sin cifrar', () => {
            const plainText = 'unencrypted-text';

            const result = service.isEncrypted(plainText);

            expect(result).toBe(false);
        });

        it('debe retornar false para texto vacío', () => {
            const result = service.isEncrypted('');

            expect(result).toBe(false);
        });

        it('debe retornar false para formato parcialmente válido', () => {
            const invalidFormat = '0123456789abcdef0123456789abcdef:invalid';

            const result = service.isEncrypted(invalidFormat);

            expect(result).toBe(false);
        });
    });

    describe('integración encrypt-decrypt', () => {
        it('debe mantener integridad de datos con caracteres especiales', () => {
            const specialText = 'test@#$%^&*()_+-=[]{}|;:,.<>?/~`';

            const encrypted = service.encrypt(specialText);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(specialText);
        });

        it('debe mantener integridad de datos con texto largo', () => {
            const longText = 'a'.repeat(1000);

            const encrypted = service.encrypt(longText);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(longText);
        });

        it('debe mantener integridad de datos con emojis y unicode', () => {
            const unicodeText = 'Hello 👋 世界 🌍';

            const encrypted = service.encrypt(unicodeText);
            const decrypted = service.decrypt(encrypted);

            expect(decrypted).toBe(unicodeText);
        });
    });
});
