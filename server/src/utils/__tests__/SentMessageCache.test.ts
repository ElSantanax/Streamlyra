import { SentMessageCache } from '../SentMessageCache';

describe('SentMessageCache', () => {
    let cache: SentMessageCache;

    beforeEach(() => {
        cache = new SentMessageCache();
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('debería marcar un mensaje como enviado y verificarlo', () => {
        cache.markAsSent('u1', 'hola');
        expect(cache.wasSentFromDashboard('u1', 'hola')).toBe(true);
        expect(cache.wasSentFromDashboard('u1', 'mundo')).toBe(false);
        expect(cache.wasSentFromDashboard('u2', 'hola')).toBe(false);
    });

    it('debería expirar mensajes tras el TTL', () => {
        cache.markAsSent('u1', 'hola');

        // Adelantar casi todo el TTL
        jest.advanceTimersByTime(3999);
        expect(cache.wasSentFromDashboard('u1', 'hola')).toBe(true);

        // Cruzar el TTL
        jest.advanceTimersByTime(1);
        expect(cache.wasSentFromDashboard('u1', 'hola')).toBe(false);
    });

    it('debería refrescar el TTL si se marca el mismo mensaje dos veces', () => {
        cache.markAsSent('u1', 'hola');
        jest.advanceTimersByTime(2000);

        cache.markAsSent('u1', 'hola'); // Refresco
        jest.advanceTimersByTime(3000);

        // Si no se hubiera refrescado, ya habría expirado (2000 + 3000 = 5000 > 4000)
        expect(cache.wasSentFromDashboard('u1', 'hola')).toBe(true);

        jest.advanceTimersByTime(1000);
        expect(cache.wasSentFromDashboard('u1', 'hola')).toBe(false);
    });

    it('debería limpiar el cache de un usuario', () => {
        cache.markAsSent('u1', 'm1');
        cache.markAsSent('u1', 'm2');
        cache.clearUser('u1');

        expect(cache.wasSentFromDashboard('u1', 'm1')).toBe(false);
        expect(cache.size()).toBe(0);
    });

    it('debería limpiar todo el cache', () => {
        cache.markAsSent('u1', 'm1');
        cache.markAsSent('u2', 'm2');
        cache.clear();

        expect(cache.size()).toBe(0);
    });

    it('debería aplicar desalojo (eviction) si se alcanza el MAX_ENTRIES', () => {
        const max = cache.getMaxEntries();

        // Llenar cache
        for (let i = 0; i < max; i++) {
            cache.markAsSent('u1', `m${i}`);
        }
        expect(cache.size()).toBe(max);

        // Añadir uno más (provoca desalojo del primero)
        cache.markAsSent('u1', 'last');

        expect(cache.size()).toBe(max);
        expect(cache.wasSentFromDashboard('u1', 'm0')).toBe(false);
        expect(cache.wasSentFromDashboard('u1', 'last')).toBe(true);
    });

    it('debería evictOldest manejar usuarios sin mensajes (caso borde)', () => {
        // Acceder a privados para forzar estado
        const c = cache as unknown as { cache: Map<string, Map<string, unknown>> };
        c.cache.set('u_empty', new Map());

        expect(cache.size()).toBe(0);

        // Marcar uno nuevo para disparar evictOldest si estuviéramos al max
        // Pero evictOldest es privado, lo probaremos indirectamente or by filling it
        const max = cache.getMaxEntries();
        for (let i = 0; i < max; i++) {
            cache.markAsSent(`u${i}`, 'm');
        }

        // Forzar un usuario vacío al principio del mapa
        const firstKey = c.cache.keys().next().value;
        c.cache.delete(firstKey as string);
        const newMap = new Map();
        newMap.set('u_empty', new Map());
        // Re-insertar otros para que u_empty sea el primero
        const oldEntries = Array.from(c.cache.entries()) as [string, Map<string, unknown>][];
        c.cache.clear();
        c.cache.set('u_empty', new Map());
        oldEntries.forEach(([k, v]) => c.cache.set(k, v));

        cache.markAsSent('u_new', 'm');
        expect(c.cache.has('u_empty')).toBe(false);
    });
});
