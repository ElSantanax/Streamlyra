import { describe, it, expect, vi } from 'vitest';
import { validateTikTokUsername, cleanUsername } from '../username.validator';

vi.mock('../../../config/i18n', () => ({
    default: {
        t: (key: string, defaultValue?: string) => defaultValue || key
    }
}));

describe('username.validator', () => {
    describe('cleanUsername', () => {
        it('debería eliminar el prefijo @', () => {
            expect(cleanUsername('@user')).toBe('user');
            expect(cleanUsername('@@@user')).toBe('user');
        });

        it('debería devolver el mismo nombre si no tiene @', () => {
            expect(cleanUsername('user')).toBe('user');
        });
    });

    describe('validateTikTokUsername', () => {
        it('debería ser inválido si está vacío', () => {
            expect(validateTikTokUsername('').isValid).toBe(false);
            expect(validateTikTokUsername('  ').isValid).toBe(false);
        });

        it('debería ser inválido si es demasiado corto o largo', () => {
            expect(validateTikTokUsername('a').isValid).toBe(false);
            expect(validateTikTokUsername('a'.repeat(25)).isValid).toBe(false);
        });

        it('debería ser inválido si tiene caracteres especiales no permitidos', () => {
            expect(validateTikTokUsername('user-name!').isValid).toBe(false);
            expect(validateTikTokUsername('user name').isValid).toBe(false);
        });

        it('debería ser válido con puntos y guiones bajos', () => {
            const result = validateTikTokUsername('user.name_123');
            expect(result.isValid).toBe(true);
            expect(result.cleaned).toBe('user.name_123');
        });

        it('debería limpiar el @ automáticamente', () => {
            const result = validateTikTokUsername('@valid_user');
            expect(result.isValid).toBe(true);
            expect(result.cleaned).toBe('valid_user');
        });
    });
});
