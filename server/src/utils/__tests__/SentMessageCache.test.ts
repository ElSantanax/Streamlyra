/** Tests para SentMessageCache */

import { SentMessageCache } from '../SentMessageCache';

describe('SentMessageCache', () => {
    let cache: SentMessageCache;

    beforeEach(() => {
        cache = new SentMessageCache();
    });

    afterEach(() => {
        cache.clear();
    });

    describe('markAsSent y wasSentFromDashboard', () => {
        it('debe marcar un mensaje como enviado', () => {
            cache.markAsSent('user-123', 'hola');
            expect(cache.wasSentFromDashboard('user-123', 'hola')).toBe(true);
        });

        it('debe retornar false para mensajes no enviados', () => {
            expect(cache.wasSentFromDashboard('user-123', 'hola')).toBe(false);
        });

        it('debe retornar false para usuarios diferentes', () => {
            cache.markAsSent('user-123', 'hola');
            expect(cache.wasSentFromDashboard('user-456', 'hola')).toBe(false);
        });

        it('debe retornar false para mensajes diferentes', () => {
            cache.markAsSent('user-123', 'hola');
            expect(cache.wasSentFromDashboard('user-123', 'adios')).toBe(false);
        });

        it('debe manejar múltiples mensajes del mismo usuario', () => {
            cache.markAsSent('user-123', 'mensaje1');
            cache.markAsSent('user-123', 'mensaje2');
            cache.markAsSent('user-123', 'mensaje3');

            expect(cache.wasSentFromDashboard('user-123', 'mensaje1')).toBe(true);
            expect(cache.wasSentFromDashboard('user-123', 'mensaje2')).toBe(true);
            expect(cache.wasSentFromDashboard('user-123', 'mensaje3')).toBe(true);
        });

        it('debe manejar múltiples usuarios', () => {
            cache.markAsSent('user-123', 'hola');
            cache.markAsSent('user-456', 'hola');

            expect(cache.wasSentFromDashboard('user-123', 'hola')).toBe(true);
            expect(cache.wasSentFromDashboard('user-456', 'hola')).toBe(true);
        });

        it('debe auto-limpiar mensajes después del TTL', async () => {
            cache.markAsSent('user-123', 'hola');
            expect(cache.wasSentFromDashboard('user-123', 'hola')).toBe(true);

            // Esperar más del TTL (8 segundos + margen)
            await new Promise(resolve => setTimeout(resolve, 8100));

            expect(cache.wasSentFromDashboard('user-123', 'hola')).toBe(false);
        }, 10000);

        it('debe actualizar el timeout si se marca el mismo mensaje otra vez', () => {
            cache.markAsSent('user-123', 'hola');
            cache.markAsSent('user-123', 'hola'); // Marcar otra vez

            expect(cache.wasSentFromDashboard('user-123', 'hola')).toBe(true);
        });
    });

    describe('clearUser', () => {
        it('debe limpiar todos los mensajes de un usuario', () => {
            cache.markAsSent('user-123', 'mensaje1');
            cache.markAsSent('user-123', 'mensaje2');
            cache.markAsSent('user-456', 'mensaje3');

            cache.clearUser('user-123');

            expect(cache.wasSentFromDashboard('user-123', 'mensaje1')).toBe(false);
            expect(cache.wasSentFromDashboard('user-123', 'mensaje2')).toBe(false);
            expect(cache.wasSentFromDashboard('user-456', 'mensaje3')).toBe(true);
        });

        it('debe manejar limpiar un usuario que no existe', () => {
            expect(() => cache.clearUser('user-999')).not.toThrow();
        });
    });

    describe('clear', () => {
        it('debe limpiar todo el caché', () => {
            cache.markAsSent('user-123', 'mensaje1');
            cache.markAsSent('user-456', 'mensaje2');

            cache.clear();

            expect(cache.wasSentFromDashboard('user-123', 'mensaje1')).toBe(false);
            expect(cache.wasSentFromDashboard('user-456', 'mensaje2')).toBe(false);
            expect(cache.size()).toBe(0);
        });
    });

    describe('size', () => {
        it('debe retornar 0 para caché vacío', () => {
            expect(cache.size()).toBe(0);
        });

        it('debe retornar el número correcto de mensajes', () => {
            cache.markAsSent('user-123', 'mensaje1');
            cache.markAsSent('user-123', 'mensaje2');
            cache.markAsSent('user-456', 'mensaje3');

            expect(cache.size()).toBe(3);
        });

        it('no debe contar duplicados', () => {
            cache.markAsSent('user-123', 'hola');
            cache.markAsSent('user-123', 'hola'); // Mismo mensaje

            expect(cache.size()).toBe(1);
        });
    });
});
