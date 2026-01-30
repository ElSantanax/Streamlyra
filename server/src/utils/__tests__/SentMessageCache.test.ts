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

    describe('memory leak prevention', () => {
        it('debe respetar el límite máximo de entradas', () => {
            const maxEntries = cache.getMaxEntries();
            
            // Agregar más mensajes que el límite
            for (let i = 0; i < maxEntries + 100; i++) {
                cache.markAsSent(`user${i}`, `message${i}`);
            }

            // El tamaño no debe exceder el límite
            expect(cache.size()).toBeLessThanOrEqual(maxEntries);
        });

        it('debe eliminar las entradas más antiguas cuando se alcanza el límite', () => {
            const maxEntries = cache.getMaxEntries();
            
            // Llenar el caché hasta el límite
            for (let i = 0; i < maxEntries; i++) {
                cache.markAsSent(`user${i}`, `message${i}`);
            }

            // Verificar que el primer mensaje está en caché
            expect(cache.wasSentFromDashboard('user0', 'message0')).toBe(true);

            // Agregar uno más (debe eliminar el más antiguo)
            cache.markAsSent('userNew', 'messageNew');

            // El primer mensaje debe haber sido eliminado
            expect(cache.wasSentFromDashboard('user0', 'message0')).toBe(false);
            
            // El nuevo mensaje debe estar presente
            expect(cache.wasSentFromDashboard('userNew', 'messageNew')).toBe(true);
        });

        it('debe mantener el tamaño en o por debajo del límite durante adiciones continuas', () => {
            const maxEntries = cache.getMaxEntries();
            
            // Agregar mensajes continuamente
            for (let i = 0; i < maxEntries * 2; i++) {
                cache.markAsSent(`user${i}`, `message${i}`);
                
                // Verificar que nunca excede el límite
                expect(cache.size()).toBeLessThanOrEqual(maxEntries);
            }
        });

        it('debe retornar el límite máximo correcto', () => {
            expect(cache.getMaxEntries()).toBe(1000);
        });
    });
});
