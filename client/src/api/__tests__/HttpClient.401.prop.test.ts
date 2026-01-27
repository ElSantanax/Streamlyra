import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { apiClient } from '../client';
import { authService } from '../../services/AuthService';

// Mock dependencies
vi.mock('../../services/AuthService', () => ({
    authService: {
        handleSessionExpired: vi.fn(),
    },
}));

describe('HttpClient Property-based Tests - 401 Handling', () => {
    const originalLocation = window.location;

    beforeEach(() => {
        vi.clearAllMocks();

        // Mock window.location
        delete (window as any).location;
        window.location = {
            ...originalLocation,
            href: '',
            pathname: '/dashboard',
        } as any;

        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        (window as any).location = originalLocation;
    });

    /**
     * Feature: client-security-robustness
     * Property 14 & 15 & 17: Manejo de error 401
     * Valida que ante CUALQUIER error 401 se dispare la limpieza de sesión
     */
    it('Property 14, 15, 17: debe invocar handleSessionExpired ante cualquier respuesta 401', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.webUrl(),
                fc.constantFrom('GET', 'POST', 'DELETE'),
                fc.object(),
                async (endpoint, method, body) => {
                    // Setup fetch to return 401
                    (fetch as any).mockResolvedValue({
                        ok: false,
                        status: 401,
                        json: async () => ({ error: 'Unauthorized' }),
                    });

                    vi.clearAllMocks();

                    try {
                        if (method === 'GET') {
                            await apiClient.get(endpoint, true);
                        } else if (method === 'POST') {
                            await apiClient.post(endpoint, body, true);
                        } else if (method === 'DELETE') {
                            await apiClient.delete(endpoint, body, true);
                        }
                    } catch {
                        // Esperamos que falle, lo importante es el efecto secundario
                    }

                    // LA PROPIEDAD: Siempre debe intentar limpiar la sesión
                    expect(authService.handleSessionExpired).toHaveBeenCalled();
                    return true;
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property 17: Idempotencia - No debe haber errores si el interceptor se llama muchas veces
     */
    it('Property 17: debe ser resiliente a múltiples llamadas 401 simultáneas', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.integer({ min: 2, max: 10 }), // Número de llamadas paralelas
                async (numCalls) => {
                    (fetch as any).mockResolvedValue({
                        ok: false,
                        status: 401,
                        json: async () => ({ error: 'Unauthorized' }),
                    });

                    vi.clearAllMocks();

                    // Disparar múltiples peticiones al mismo tiempo
                    const promises = Array.from({ length: numCalls }).map(() =>
                        apiClient.get('/any-endpoint', true).catch(() => { })
                    );

                    await Promise.all(promises);

                    // Debería haberse llamado tantas veces como peticiones (el control de idempotencia real está dentro del servicio)
                    expect(authService.handleSessionExpired).toHaveBeenCalledTimes(numCalls);
                    return true;
                }
            )
        );
    });
});
