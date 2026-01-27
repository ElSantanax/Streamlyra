import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { authService as apiAuthService } from '../../api/services/auth.service';
import { authService } from '../../services/AuthService';
import { useNavigate } from 'react-router-dom';

// Mock dependencies
vi.mock('../../api/services/auth.service', () => ({
    authService: {
        getMe: vi.fn(),
        logout: vi.fn(),
    },
}));

vi.mock('../../services/AuthService', () => ({
    authService: {
        clearLocalSession: vi.fn(),
    },
}));

vi.mock('react-router-dom', () => ({
    useNavigate: vi.fn(),
}));

describe('useAuth', () => {
    const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useNavigate as any).mockReturnValue(mockNavigate);
        localStorage.clear();
    });

    describe('checkAuth', () => {
        it('debe llamar a /auth/me automáticamente al montar', async () => {
            (apiAuthService.getMe as any).mockResolvedValue({ user: { id: '1' } });

            renderHook(() => useAuth());

            expect(apiAuthService.getMe).toHaveBeenCalled();
        });

        it('debe actualizar el usuario tras una respuesta exitosa de /auth/me', async () => {
            const mockUser = { id: '1', username: 'testuser' };
            (apiAuthService.getMe as any).mockResolvedValue({ user: mockUser });

            const { result } = renderHook(() => useAuth());

            let authResult;
            await act(async () => {
                authResult = await result.current.checkAuth();
            });

            expect(apiAuthService.getMe).toHaveBeenCalled();
            expect(result.current.user).toEqual(mockUser);
            expect(authResult).toEqual(mockUser);
            expect(result.current.isAuthenticated).toBe(true);
        });

        it('debe limpiar la sesión si /auth/me falla', async () => {
            (apiAuthService.getMe as any).mockRejectedValue(new Error('Unauthorized'));

            const { result } = renderHook(() => useAuth());

            await act(async () => {
                await result.current.checkAuth();
            });

            expect(apiAuthService.getMe).toHaveBeenCalled();
            expect(authService.clearLocalSession).toHaveBeenCalled();
            expect(result.current.user).toBeNull();
            expect(result.current.isAuthenticated).toBe(false);
        });

        it('debe manejar el estado isChecking correctamente', async () => {
            let resolveGetMe: (value: any) => void;
            const promise = new Promise((resolve) => {
                resolveGetMe = resolve;
            });
            (apiAuthService.getMe as any).mockReturnValue(promise);

            const { result } = renderHook(() => useAuth());

            let checkPromise: Promise<any>;
            act(() => {
                checkPromise = result.current.checkAuth();
            });

            // Debería estar cargando. Usamos waitFor para dar tiempo al re-render inicial
            await waitFor(() => {
                expect(result.current.isChecking).toBe(true);
            });

            // Resolver
            await act(async () => {
                resolveGetMe!({ user: { id: '1' } });
                await checkPromise;
            });

            // Ya no debería estar cargando
            expect(result.current.isChecking).toBe(false);
        });
    });

    describe('logout', () => {
        it('debe limpiar todo al cerrar sesión', async () => {
            (apiAuthService.logout as any).mockResolvedValue({ success: true });
            localStorage.setItem('user', JSON.stringify({ id: '1' }));

            const { result } = renderHook(() => useAuth());

            // Verificar que el usuario inicial se cargó
            expect(result.current.user).toEqual({ id: '1' });

            await act(async () => {
                await result.current.logout();
            });

            expect(apiAuthService.logout).toHaveBeenCalled();
            expect(authService.clearLocalSession).toHaveBeenCalled();
            expect(result.current.user).toBeNull();
            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });
});
