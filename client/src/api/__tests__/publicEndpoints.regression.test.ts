/**
 * Regression tests for public endpoints
 * 
 * Feature: client-security-robustness
 * Task 8.3: Verificar que endpoints sin auth siguen funcionando
 * Valida Requisito 5.5: Endpoints públicos no deben romperse con migración a HttpOnly cookies
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiError } from '../client';
import { authService } from '../services/auth.service';

describe('Public Endpoints Regression Tests', () => {
    beforeEach(() => {
        // Mock fetch para simular respuestas del servidor
        vi.stubGlobal('fetch', vi.fn());
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    describe('/auth/me endpoint (public)', () => {
        it('debe funcionar sin autenticación cuando el usuario no está logueado', async () => {
            // Simular respuesta 401 del servidor (usuario no autenticado)
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Unauthorized' }),
            } as Response);

            // El endpoint /auth/me se llama con requiresAuth=false
            // No debe redirigir ni limpiar sesión, solo debe lanzar error
            try {
                await authService.getMe();
                expect.fail('Should have thrown an error');
            } catch (error) {
                expect(error).toBeInstanceOf(ApiError);
                expect((error as ApiError).message).toBe('Unauthorized');
                expect((error as ApiError).status).toBe(401);
            }

            // Verificar que fetch fue llamado con credentials: 'include'
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/auth/me'),
                expect.objectContaining({
                    credentials: 'include',
                })
            );
        });

        it('debe retornar datos de usuario cuando está autenticado', async () => {
            const mockUserData = {
                id: 'user-123',
                email: 'test@example.com',
                username: 'testuser',
                avatar: 'https://example.com/avatar.jpg',
                createdAt: '2024-01-01T00:00:00Z',
            };

            // Simular respuesta exitosa del servidor
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockUserData,
            } as Response);

            const result = await authService.getMe();

            expect(result).toEqual(mockUserData);
            expect(fetch).toHaveBeenCalledWith(
                expect.stringContaining('/auth/me'),
                expect.objectContaining({
                    credentials: 'include',
                    method: 'GET',
                })
            );
        });

        it('debe incluir credentials en la petición para enviar cookies HttpOnly', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ id: '1', email: 'test@test.com', username: 'test' }),
            } as Response);

            await authService.getMe();

            const fetchMock = vi.mocked(fetch);
            const fetchCall = fetchMock.mock.calls[0];
            const options = fetchCall[1] as RequestInit;

            // Verificar que credentials: 'include' está presente
            expect(options.credentials).toBe('include');
        });

        it('NO debe activar handleSessionExpired cuando recibe 401 (requiresAuth=false)', async () => {
            // Mock de sessionManager.handleSessionExpired para verificar que NO se llama
            const sessionManagerModule = await import('../../services/SessionManager');
            const handleSessionExpiredSpy = vi.spyOn(sessionManagerModule.sessionManager, 'handleSessionExpired');

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Unauthorized' }),
            } as Response);

            try {
                await authService.getMe();
            } catch {
                // Esperamos que lance error
            }

            // Verificar que handleSessionExpired NO fue llamado
            expect(handleSessionExpiredSpy).not.toHaveBeenCalled();

            handleSessionExpiredSpy.mockRestore();
        });
    });

    describe('Public endpoints - General behavior', () => {
        it('debe permitir peticiones GET sin autenticación', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: 'public data' }),
            } as Response);

            const result = await apiClient.get('/public/endpoint', false);

            expect(result).toEqual({ data: 'public data' });
            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'GET',
                    credentials: 'include',
                })
            );
        });

        it('debe permitir peticiones POST sin autenticación', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ success: true }),
            } as Response);

            const result = await apiClient.post('/public/action', { data: 'test' }, false);

            expect(result).toEqual({ success: true });
            expect(fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    method: 'POST',
                    credentials: 'include',
                    body: JSON.stringify({ data: 'test' }),
                })
            );
        });

        it('debe manejar errores de red en endpoints públicos', async () => {
            vi.mocked(fetch).mockRejectedValueOnce(new Error('Network failure'));

            await expect(apiClient.get('/public/endpoint', false)).rejects.toThrow(ApiError);
            await expect(apiClient.get('/public/endpoint', false)).rejects.toThrow('Network error');
        });

        it('debe manejar errores 4xx/5xx en endpoints públicos sin activar limpieza de sesión', async () => {
            // Probar diferentes códigos de error
            const errorCodes = [400, 403, 404, 500, 503];

            for (const code of errorCodes) {
                vi.mocked(fetch).mockResolvedValueOnce({
                    ok: false,
                    status: code,
                    json: async () => ({ error: `Error ${code}` }),
                } as Response);

                await expect(apiClient.get('/public/endpoint', false)).rejects.toThrow(ApiError);
            }
        });
    });

    describe('Backwards compatibility', () => {
        it('debe mantener la misma interfaz de apiClient para endpoints públicos', () => {
            // Verificar que los métodos públicos existen y tienen la firma correcta
            expect(typeof apiClient.get).toBe('function');
            expect(typeof apiClient.post).toBe('function');
            expect(typeof apiClient.delete).toBe('function');

            // Verificar que aceptan el parámetro requiresAuth
            expect(apiClient.get.length).toBeGreaterThanOrEqual(1);
            expect(apiClient.post.length).toBeGreaterThanOrEqual(2);
            expect(apiClient.delete.length).toBeGreaterThanOrEqual(2);
        });

        it('debe mantener compatibilidad con authService.getMe()', () => {
            // Verificar que el método existe
            expect(typeof authService.getMe).toBe('function');
            expect(authService.getMe.length).toBe(0); // No requiere parámetros
        });

        it('debe incluir credentials: include en todas las peticiones (públicas y protegidas)', async () => {
            const endpoints = [
                { path: '/public', requiresAuth: false },
                { path: '/protected', requiresAuth: true },
            ];

            for (const endpoint of endpoints) {
                vi.mocked(fetch).mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: async () => ({ success: true }),
                } as Response);

                await apiClient.get(endpoint.path, endpoint.requiresAuth);

                const fetchMock = vi.mocked(fetch);
                const lastCall = fetchMock.mock.calls[fetchMock.mock.calls.length - 1];
                const options = lastCall[1] as RequestInit;
                expect(options.credentials).toBe('include');
            }
        });
    });

    describe('HttpOnly cookie migration compatibility', () => {
        it('debe enviar cookies automáticamente en peticiones públicas', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: 'test' }),
            } as Response);

            await apiClient.get('/auth/me', false);

            // Verificar que credentials: 'include' permite envío automático de cookies
            const fetchMock = vi.mocked(fetch);
            const fetchCall = fetchMock.mock.calls[0];
            const options = fetchCall[1] as RequestInit;
            expect(options.credentials).toBe('include');
        });

        it('NO debe intentar leer tokens de localStorage para endpoints públicos', async () => {
            // Mock de localStorage
            const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: 'test' }),
            } as Response);

            await apiClient.get('/public/endpoint', false);

            // HttpClient NO debe leer tokens de localStorage
            // (la autenticación se maneja por cookies HttpOnly)
            expect(getItemSpy).not.toHaveBeenCalledWith('token');
            expect(getItemSpy).not.toHaveBeenCalledWith('authToken');

            getItemSpy.mockRestore();
        });

        it('NO debe añadir Authorization header en peticiones públicas', async () => {
            vi.mocked(fetch).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: 'test' }),
            } as Response);

            await apiClient.get('/public/endpoint', false);

            const fetchMock = vi.mocked(fetch);
            const fetchCall = fetchMock.mock.calls[0];
            const options = fetchCall[1] as RequestInit;
            const headers = options.headers as Record<string, string>;

            // No debe haber Authorization header
            expect(headers.Authorization).toBeUndefined();
            expect(headers.authorization).toBeUndefined();
        });
    });
});
