import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { useAuth } from '../../hooks/useAuth';

vi.mock('../../hooks/useAuth', () => ({
    useAuth: vi.fn()
}));

vi.mock('./Spinner', () => ({
    default: ({ text }: { text: string }) => <div data-testid="spinner">{text}</div>
}));

describe('ProtectedRoute', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderWithRouter = (ui: React.ReactElement, initialRoute = '/protected') => {
        return render(
            <MemoryRouter initialEntries={[initialRoute]}>
                <Routes>
                    <Route path="/protected" element={ui} />
                    <Route path="/login" element={<div data-testid="login-page">Login Page</div>} />
                    <Route path="/custom-login" element={<div data-testid="custom-login-page">Custom Login Page</div>} />
                </Routes>
            </MemoryRouter>
        );
    };

    it('debería mostrar el spinner cuando el estado de autenticación es desconocido', () => {
        vi.mocked(useAuth).mockReturnValue({
            status: 'unknown',
            isAuthenticated: false
        } as ReturnType<typeof useAuth>);

        renderWithRouter(
            <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>
        );

        expect(screen.getByTestId('spinner')).toBeInTheDocument();
        expect(screen.getByText('Verificando sesión...')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('debería redirigir a /login por defecto cuando el usuario no está autenticado', () => {
        vi.mocked(useAuth).mockReturnValue({
            status: 'unauthenticated',
            isAuthenticated: false
        } as ReturnType<typeof useAuth>);

        renderWithRouter(
            <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>,
            '/protected'
        );

        expect(screen.getByTestId('login-page')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('debería redirigir a una ruta personalizada cuando no está autenticado y se proporciona redirectTo', () => {
        vi.mocked(useAuth).mockReturnValue({
            status: 'unauthenticated',
            isAuthenticated: false
        } as ReturnType<typeof useAuth>);

        renderWithRouter(
            <ProtectedRoute redirectTo="/custom-login">
                <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>,
            '/protected'
        );

        expect(screen.getByTestId('custom-login-page')).toBeInTheDocument();
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('debería renderizar los hijos cuando el usuario está autenticado', () => {
        vi.mocked(useAuth).mockReturnValue({
            status: 'authenticated',
            isAuthenticated: true
        } as ReturnType<typeof useAuth>);

        renderWithRouter(
            <ProtectedRoute>
                <div data-testid="protected-content">Protected Content</div>
            </ProtectedRoute>
        );

        expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
        expect(screen.queryByTestId('spinner')).not.toBeInTheDocument();
    });
});
