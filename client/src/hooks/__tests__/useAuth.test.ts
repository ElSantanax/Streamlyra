import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { authService } from '../../services/api/auth.service';
import { sessionManager } from '../../services/SessionManager';
import { useNavigate } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthProvider';
import { useAuth } from '../useAuth';
import type { User, ConnectionInfo } from '../../types/user.types';

// Mock dependencies
vi.mock('../../services/api/auth.service', () => ({
    authService: {
        getMe: vi.fn(),
        logout: vi.fn(),
    },
}));

vi.mock('../../services/SessionManager', () => ({
    sessionManager: {
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
        vi.mocked(useNavigate).mockReturnValue(mockNavigate);
        localStorage.clear();

        delete (window as unknown as { location: unknown }).location;
        (window as unknown as { location: Location }).location = {
            ...originalLocation,
            href: '',
            pathname: '/dashboard',
        } as Location;
    });

    afterEach(() => {
        (window as unknown as { location: Location }).location = originalLocation;
    });

    describe('checkAuth', () => {
        it('debe llamar a /auth/me automáticamente al montar', async () => {
            vi.mocked(authService.getMe).mockResolvedValue({
                user: { id: '1', username: 'testuser', displayName: 'Test User', avatar: '' },
                connections: {}
            });

            renderHook(() => useAuth(), { wrapper });

            await waitFor(() => {
                expect(authService.getMe).toHaveBeenCalled();
            });
        });

        it('debe actualizar el usuario tras una respuesta exitosa de /auth/me', async () => {
            const mockUser: User = { id: '1', username: 'testuser', displayName: 'Test User', avatar: '' };
            vi.mocked(authService.getMe).mockResolvedValue({ user: mockUser, connections: {} });

            const { result } = renderHook(() => useAuth(), { wrapper });

            let authResult;
            await act(async () => {
                authResult = await result.current.checkAuth();
            });

            expect(authService.getMe).toHaveBeenCalled();
            expect(result.current.user).toEqual(mockUser);
            expect(authResult).toEqual(mockUser);
            expect(result.current.isAuthenticated).toBe(true);
        });

        it('debe limpiar la sesión si /auth/me falla', async () => {
            vi.mocked(authService.getMe).mockRejectedValue(new Error('Unauthorized'));

            const { result } = renderHook(() => useAuth(), { wrapper });

            await waitFor(() => {
                expect(authService.getMe).toHaveBeenCalled();
                expect(sessionManager.clearLocalSession).toHaveBeenCalled();
                expect(result.current.user).toBeNull();
                expect(result.current.isAuthenticated).toBe(false);
            });
        });

        it('debe manejar el estado isChecking correctamente', async () => {
            let resolveGetMe: ((value: { user: User; connections: Record<string, ConnectionInfo> }) => void) | undefined;
            const promise = new Promise<{ user: User; connections: Record<string, ConnectionInfo> }>((resolve) => {
                resolveGetMe = resolve;
            });
            vi.mocked(authService.getMe).mockReturnValue(promise);

            const { result } = renderHook(() => useAuth(), { wrapper });

            let checkPromise: Promise<unknown>;
            act(() => {
                checkPromise = result.current.checkAuth();
            });

            // Debería estar cargando. Usamos waitFor para dar tiempo al re-render inicial
            await waitFor(() => {
                expect(result.current.isChecking).toBe(true);
            });

            // Resolver
            await act(async () => {
                resolveGetMe!({
                    user: { id: '1', username: 'testuser', displayName: 'Test User', avatar: '' },
                    connections: {}
                });
                await checkPromise;
            });

            // Ya no debería estar cargando
            expect(result.current.isChecking).toBe(false);
        });
    });

    describe('logout', () => {
        it('debe limpiar todo al cerrar sesión', async () => {
            vi.mocked(authService.logout).mockResolvedValue(undefined);
            vi.mocked(authService.getMe).mockRejectedValue(new Error('Unauthorized'));
            localStorage.setItem('user', JSON.stringify({ id: '1' }));

            const { result } = renderHook(() => useAuth(), { wrapper });

            // Verificar que el usuario inicial se cargó
            expect(result.current.user).toEqual({ id: '1' });

            await act(async () => {
                await result.current.logout();
            });

            expect(authService.logout).toHaveBeenCalled();
            expect(sessionManager.clearLocalSession).toHaveBeenCalled();

            await waitFor(() => {
                expect(localStorage.getItem('user')).toBeNull();
                expect(result.current.isAuthenticated).toBe(false);
            });

            expect(mockNavigate).toHaveBeenCalledWith('/');
        });
    });
});
