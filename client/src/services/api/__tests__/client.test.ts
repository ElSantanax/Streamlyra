import { apiClient, ApiError } from '../client';
import { sessionManager } from '../../session';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../session', () => ({
  sessionManager: {
    handleSessionExpired: vi.fn(),
  }
}));

describe('HttpClient', () => {
    const mockFetch = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', mockFetch);
        // Mock document.cookie
        Object.defineProperty(document, 'cookie', {
            writable: true,
            value: '',
            configurable: true,
        });
        // Mock window.location
        Object.defineProperty(window, 'location', {
            writable: true,
            value: { pathname: '/dashboard' },
            configurable: true,
        });
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('debería realizar una petición GET exitosa', async () => {
        const mockData = { success: true };
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockData,
        });

        const result = await apiClient.get('/test');

        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/test'), expect.objectContaining({
            method: 'GET',
            headers: expect.objectContaining({
                'Content-Type': 'application/json',
            }) as unknown as Record<string, string>,
        }));
        expect(result).toEqual(mockData);
    });

    it('debería realizar una petición POST con datos y token CSRF si existe', async () => {
        document.cookie = 'csrf_token=mock-token';
        const postData = { name: 'test' };
        mockFetch.mockResolvedValue({
            ok: true,
            status: 201,
            json: async () => ({ id: 1 }),
        });

        const result = await apiClient.post('/create', postData);

        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/create'), expect.objectContaining({
            method: 'POST',
            body: JSON.stringify(postData),
            headers: expect.objectContaining({
                'X-CSRF-Token': 'mock-token',
            }) as unknown as Record<string, string>,
        }));
        expect(result).toEqual({ id: 1 });
    });

    it('debería lanzar un ApiError si la respuesta no es ok', async () => {
        const errorResponse = { error: 'Invalid data' };
        mockFetch.mockResolvedValue({
            ok: false,
            status: 400,
            json: async () => errorResponse,
        });

        await expect(apiClient.get('/error')).rejects.toThrow(ApiError);
        try {
            await apiClient.get('/error');
        } catch (error: unknown) {
            if (error instanceof ApiError) {
                expect(error.status).toBe(400);
                expect(error.message).toBe('Invalid data');
                expect(error.data).toEqual(errorResponse);
            } else {
                throw error;
            }
        }
    });

    it('debería llamar a sessionManager.handleSessionExpired en caso de 401 si requiere auth', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 401,
            json: async () => ({ message: 'Unauthorized' }),
        });

        await expect(apiClient.get('/protected', true)).rejects.toThrow();
        expect(sessionManager.handleSessionExpired).toHaveBeenCalled();
    });

    it('no debería llamar a sessionManager.handleSessionExpired en 401 si NO requiere auth', async () => {
        mockFetch.mockResolvedValue({
            ok: false,
            status: 401,
            json: async () => ({ message: 'Unauthorized' }),
        });

        await expect(apiClient.get('/protected', false)).rejects.toThrow();
        expect(sessionManager.handleSessionExpired).not.toHaveBeenCalled();
    });

    it('debería lanzar un Error de Red si fetch falla', async () => {
        mockFetch.mockRejectedValue(new Error('Failed to fetch'));

        await expect(apiClient.get('/any')).rejects.toThrow('Network error');
    });

    it('debería realizar una petición DELETE exitosa', async () => {
        mockFetch.mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ deleted: true }),
        });

        const result = await apiClient.delete('/delete/1');
        expect(result).toEqual({ deleted: true });
        expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('/delete/1'), expect.objectContaining({
            method: 'DELETE',
        }));
    });
});
