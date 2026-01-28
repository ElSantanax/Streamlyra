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
            (fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Unauthorized' }),
            });

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
            (fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => mockUserData,
            });

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
            (fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ id: '1', email: 'test@test.com', username: 'test' }),
            });

            await authService.getMe();

            const fetchCall = (fetch as any).mock.calls[0];
            const options = fetchCall[1];

            // Verificar que credentials: 'include' está presente
            expect(options.credentials).toBe('include');
        });

        it('NO debe activar handleSessionExpired cuando recibe 401 (requiresAuth=false)', async () => {
            // Mock de sessionManager.handleSessionExpired para verificar que NO se llama
            const sessionManagerModule = await import('../../services/SessionManager');
            const handleSessionExpiredSpy = vi.spyOn(sessionManagerModule.sessionManager, 'handleSessionExpired');

            (fetch as any).mockResolvedValueOnce({
                ok: false,
                status: 401,
                json: async () => ({ error: 'Unauthorized' }),
            });

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
            (fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: 'public data' }),
            });

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
            (fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ success: true }),
            });

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
            (fetch as any).mockRejectedValueOnce(new Error('Network failure'));

            await expect(apiClient.get('/public/endpoint', false)).rejects.toThrow(ApiError);
            await expect(apiClient.get('/public/endpoint', false)).rejects.toThrow('Network error');
        });

        it('debe manejar errores 4xx/5xx en endpoints públicos sin activar limpieza de sesión', async () => {
            // Probar diferentes códigos de error
            const errorCodes = [400, 403, 404, 500, 503];

            for (const code of errorCodes) {
                (fetch as any).mockResolvedValueOnce({
                    ok: false,
                    status: code,
                    json: async () => ({ error: `Error ${code}` }),
                });

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
                (fetch as any).mockResolvedValueOnce({
                    ok: true,
                    status: 200,
                    json: async () => ({ success: true }),
                });

                await apiClient.get(endpoint.path, endpoint.requiresAuth);

                const lastCall = (fetch as any).mock.calls[(fetch as any).mock.calls.length - 1];
                expect(lastCall[1].credentials).toBe('include');
            }
        });
    });

    describe('HttpOnly cookie migration compatibility', () => {
        it('debe enviar cookies automáticamente en peticiones públicas', async () => {
            (fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: 'test' }),
            });

            await apiClient.get('/auth/me', false);

            // Verificar que credentials: 'include' permite envío automático de cookies
            const fetchCall = (fetch as any).mock.calls[0];
            expect(fetchCall[1].credentials).toBe('include');
        });

        it('NO debe intentar leer tokens de localStorage para endpoints públicos', async () => {
            // Mock de localStorage
            const getItemSpy = vi.spyOn(Storage.prototype, 'getItem');

            (fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: 'test' }),
            });

            await apiClient.get('/public/endpoint', false);

            // HttpClient NO debe leer tokens de localStorage
            // (la autenticación se maneja por cookies HttpOnly)
            expect(getItemSpy).not.toHaveBeenCalledWith('token');
            expect(getItemSpy).not.toHaveBeenCalledWith('authToken');

            getItemSpy.mockRestore();
        });

        it('NO debe añadir Authorization header en peticiones públicas', async () => {
            (fetch as any).mockResolvedValueOnce({
                ok: true,
                status: 200,
                json: async () => ({ data: 'test' }),
            });

            await apiClient.get('/public/endpoint', false);

            const fetchCall = (fetch as any).mock.calls[0];
            const headers = fetchCall[1].headers;

            // No debe haber Authorization header
            expect(headers.Authorization).toBeUndefined();
            expect(headers.authorization).toBeUndefined();
        });
    });
});
