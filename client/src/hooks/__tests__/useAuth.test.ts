import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { authService as apiAuthService } from '../../api/services/auth.service';
import { authService } from '../../services/AuthService';
import { useNavigate } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthProvider';
import { useAuth } from '../useAuth';

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
        setSessionExpiredHandler: vi.fn(),
    },
}));

vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(),
    };
});

describe('useAuth', () => {
    const mockNavigate = vi.fn();
    const originalLocation = window.location;

    const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(
            MemoryRouter,
            { initialEntries: ['/dashboard'] },
            React.createElement(AuthProvider, null, children)
        );

    beforeEach(() => {
        vi.clearAllMocks();
        (useNavigate as any).mockReturnValue(mockNavigate);
        localStorage.clear();

        delete (window as any).location;
        window.location = {
            ...originalLocation,
            href: '',
            pathname: '/dashboard',
        } as any;
    });

    afterEach(() => {
        (window as any).location = originalLocation;
    });

    describe('checkAuth', () => {
        it('debe llamar a /auth/me automáticamente al montar', async () => {
            (apiAuthService.getMe as any).mockResolvedValue({ user: { id: '1' } });

            renderHook(() => useAuth(), { wrapper });

            await waitFor(() => {
                expect(apiAuthService.getMe).toHaveBeenCalled();
            });
        });

        it('debe actualizar el usuario tras una respuesta exitosa de /auth/me', async () => {
            const mockUser = { id: '1', username: 'testuser' };
            (apiAuthService.getMe as any).mockResolvedValue({ user: mockUser });

            const { result } = renderHook(() => useAuth(), { wrapper });

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

            const { result } = renderHook(() => useAuth(), { wrapper });

            await waitFor(() => {
                expect(apiAuthService.getMe).toHaveBeenCalled();
                expect(authService.clearLocalSession).toHaveBeenCalled();
                expect(result.current.user).toBeNull();
                expect(result.current.isAuthenticated).toBe(false);
            });
        });

        it('debe manejar el estado isChecking correctamente', async () => {
            let resolveGetMe: (value: any) => void;
            const promise = new Promise((resolve) => {
                resolveGetMe = resolve;
            });
            (apiAuthService.getMe as any).mockReturnValue(promise);

            const { result } = renderHook(() => useAuth(), { wrapper });

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
            (apiAuthService.getMe as any).mockRejectedValue(new Error('Unauthorized'));
            localStorage.setItem('user', JSON.stringify({ id: '1' }));

            const { result } = renderHook(() => useAuth(), { wrapper });

            // Verificar que el usuario inicial se cargó
            expect(result.current.user).toEqual({ id: '1' });

            await act(async () => {
                await result.current.logout();
            });

            expect(apiAuthService.logout).toHaveBeenCalled();
            expect(authService.clearLocalSession).toHaveBeenCalled();

            await waitFor(() => {
                expect(localStorage.getItem('user')).toBeNull();
                expect(result.current.isAuthenticated).toBe(false);
            });

            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });
});
