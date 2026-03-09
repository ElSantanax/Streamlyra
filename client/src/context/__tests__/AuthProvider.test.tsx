import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../AuthProvider';
import { useAuthContext } from '../../hooks/useAuthContext';
import { authService } from '../../services/api/auth.service';
import { sessionManager } from '../../services/session';
import type { User, MeResponse } from '../../types';

// Mock dependencias
vi.mock('../../services/api/auth.service', () => ({
  authService: {
    getMe: vi.fn(),
    logout: vi.fn(),
  }
}));

vi.mock('../../services/session', () => ({
  sessionManager: {
    setSessionExpiredHandler: vi.fn(),
    clearLocalSession: vi.fn(),
  }
}));

// Un componente de prueba para consumir el AuthContext
const TestComponent = () => {
  const { status, isAuthenticated, login, logout, requireAuth, checkAuth, user } = useAuthContext();
  
  return (
    <div>
      <div data-testid="status">{status}</div>
      <div data-testid="isAuthenticated">{String(isAuthenticated)}</div>
      <div data-testid="user">{user ? user.username : 'none'}</div>
      <button onClick={() => login({ id: '1', username: 'testuser' } as unknown as User)}>Login</button>
      <button onClick={() => logout()}>Logout</button>
      <button onClick={() => requireAuth()}>RequireAuth</button>
      <button onClick={() => checkAuth()}>CheckAuth</button>
    </div>
  );
};

// Envolver con Router y Provider
const renderAuth = (initialRoute = '/') => {
  return render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <AuthProvider>
        <Routes>
          <Route path="/*" element={<TestComponent />} />
          <Route path="/login" element={<div data-testid="login-page">Login Redirected</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
};

describe('AuthProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('debería inicializar con unauthenticated si no hay user', () => {
    renderAuth('/');
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('false');
  });

  it('debería inicializar con authenticated si hay un user en localStorage', () => {
    localStorage.setItem('user', JSON.stringify({ id: '1', username: 'localuser' }));
    renderAuth('/');
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('isAuthenticated')).toHaveTextContent('true');
    expect(screen.getByTestId('user')).toHaveTextContent('localuser');
  });

  it('debería hacer login y actualizar el estado', async () => {
    renderAuth('/');
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    
    act(() => {
      screen.getByText('Login').click();
    });

    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('testuser');
    expect(localStorage.getItem('user')).toContain('testuser');
  });

  it('debería hacer logout, limpiar sesión y redirigir', async () => {
    localStorage.setItem('user', JSON.stringify({ id: '1', username: 'localuser' }));
    renderAuth('/');
    
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');

    await act(async () => {
      screen.getByText('Logout').click();
    });

    expect(authService.logout).toHaveBeenCalled();
    expect(sessionManager.clearLocalSession).toHaveBeenCalled();
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('debería redirigir a /login si requireAuth se llama y no está autenticado', async () => {
    renderAuth('/');
    act(() => {
      screen.getByText('RequireAuth').click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('login-page')).toBeInTheDocument();
    });
  });

  it('debería hacer checkAuth correctamente', async () => {
    const mockUser = { id: '99', username: 'fetcheduser' };
    vi.mocked(authService.getMe).mockResolvedValue({ user: mockUser as unknown as User } as MeResponse);

    renderAuth('/');

    await act(async () => {
      screen.getByText('CheckAuth').click();
    });

    expect(authService.getMe).toHaveBeenCalled();
    expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    expect(screen.getByTestId('user')).toHaveTextContent('fetcheduser');
  });

  it('debería manejar error en checkAuth limpiando estado', async () => {
    vi.mocked(authService.getMe).mockRejectedValue(new Error('Network error'));
    localStorage.setItem('user', JSON.stringify({ id: '1', username: 'localuser' }));

    renderAuth('/');
    // Como tiene usuario inicializa en true, ahora forzamos checkAuth que falled

    await act(async () => {
      screen.getByText('CheckAuth').click();
    });

    expect(authService.getMe).toHaveBeenCalled();
    expect(sessionManager.clearLocalSession).toHaveBeenCalled();
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    expect(localStorage.getItem('user')).toBeNull();
  });
});
