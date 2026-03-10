import { describe, it, expect } from 'vitest';
import { validateMessage } from '../messageValidation';

describe('messageValidation', () => {
    describe('validateMessage', () => {
        it('debería retornar true para un mensaje válido con texto', () => {
            expect(validateMessage('Hola mundo')).toBe(true);
        });

        it('debería retornar false para un mensaje vacío', () => {
            expect(validateMessage('')).toBe(false);
        });

        it('debería retornar false para un mensaje que solo contiene espacios en blanco', () => {
            expect(validateMessage('   ')).toBe(false);
            expect(validateMessage('\n\t')).toBe(false);
        });

        it('debería retornar true para mensajes con un solo carácter no-espacio', () => {
            expect(validateMessage('a')).toBe(true);
            expect(validateMessage('.')).toBe(true);
        });

        it('debería ignorar espacios al inicio y al final', () => {
            expect(validateMessage('   mensaje   ')).toBe(true);
        });
    });
});
