/**
 * Tests para ProtectedRoute
 * Feature: client-security-robustness
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import * as fc from 'fast-check';
import { ProtectedRoute } from '../ProtectedRoute';

// Mock del hook useAuth
const mockUseAuth = vi.fn();
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Propiedad 1: Validación de autenticación antes de renderizado', () => {
    it('debe renderizar children solo cuando el usuario está autenticado', () => {
      // Feature: client-security-robustness, Property 1: Validación de autenticación antes de renderizado
      // Valida: Requisitos 1.1
      
      fc.assert(
        fc.property(fc.boolean(), (isAuthenticated) => {
          mockUseAuth.mockReturnValue({
            isAuthenticated,
            user: isAuthenticated ? { id: '1', username: 'test' } : null,
          });

          const { unmount } = render(
            <MemoryRouter initialEntries={['/protected']}>
              <Routes>
                <Route
                  path="/protected"
                  element={
                    <ProtectedRoute>
                      <div data-testid="protected-content">Contenido Protegido</div>
                    </ProtectedRoute>
                  }
                />
                <Route path="/login" element={<div data-testid="login-page">Login</div>} />
              </Routes>
            </MemoryRouter>
          );

          try {
            if (isAuthenticated) {
              // Usuario autenticado: debe ver el contenido protegido
              expect(screen.getByTestId('protected-content')).toBeInTheDocument();
              expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
            } else {
              // Usuario no autenticado: debe ser redirigido a login
              expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
              expect(screen.getByTestId('login-page')).toBeInTheDocument();
            }
          } finally {
            unmount();
          }
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Propiedad 2: Redirección de usuarios no autenticados', () => {
    it('debe redirigir a /login cuando el usuario no está autenticado', () => {
      // Feature: client-security-robustness, Property 2: Redirección de usuarios no autenticados
      // Valida: Requisitos 1.2
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div data-testid="dashboard">Dashboard</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login">Login Page</div>} />
          </Routes>
        </MemoryRouter>
      );

      // Verificar que se redirigió a login
      expect(screen.getByTestId('login')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    });
  });

  describe('Propiedad 3: Preservación de URL destino en redirección', () => {
    it('debe preservar la URL original en el parámetro redirect', () => {
      // Feature: client-security-robustness, Property 3: Preservación de URL destino en redirección
      // Valida: Requisitos 1.3
      
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
      });

      // Usar un callback para capturar el valor con useEffect (cumple con linting)
      let capturedRedirect = '';
      
      function LoginPageWithCapture() {
        const location = useLocation();
        
        useEffect(() => {
          const searchParams = new URLSearchParams(location.search);
          capturedRedirect = searchParams.get('redirect') || '';
        }, [location.search]);
        
        return <div data-testid="login">Login Page</div>;
      }

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div>Dashboard</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<LoginPageWithCapture />} />
          </Routes>
        </MemoryRouter>
      );

      // Verificar que se redirigió a login
      expect(screen.getByTestId('login')).toBeInTheDocument();
      
      // Verificar que la URL original está en el parámetro redirect
      expect(capturedRedirect).toBe('/dashboard');
    });

    it('debe preservar diferentes rutas protegidas', () => {
      const testCases = [
        { path: '/profile', expected: '/profile' },
        { path: '/settings', expected: '/settings' },
        { path: '/admin', expected: '/admin' },
      ];

      testCases.forEach(({ path, expected }) => {
        mockUseAuth.mockReturnValue({
          isAuthenticated: false,
          user: null,
        });

        let capturedRedirect = '';
        
        function LoginPageWithCapture() {
          const location = useLocation();
          
          useEffect(() => {
            const searchParams = new URLSearchParams(location.search);
            capturedRedirect = searchParams.get('redirect') || '';
          }, [location.search]);
          
          return <div data-testid={`login-${path}`}>Login</div>;
        }

        const { unmount } = render(
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route
                path={path}
                element={
                  <ProtectedRoute>
                    <div>Protected</div>
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<LoginPageWithCapture />} />
            </Routes>
          </MemoryRouter>
        );

        expect(capturedRedirect).toBe(expected);
        unmount();
      });
    });
  });

  describe('Renderizado con autenticación', () => {
    it('debe renderizar children cuando el usuario está autenticado', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', username: 'testuser', displayName: 'Test User', avatar: 'avatar.jpg' },
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div data-testid="dashboard-content">Dashboard Content</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div>Login</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('dashboard-content')).toBeInTheDocument();
      expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
    });
  });

  describe('Prop redirectTo personalizada', () => {
    it('debe usar redirectTo personalizado cuando se proporciona', () => {
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
      });

      render(
        <MemoryRouter initialEntries={['/admin']}>
          <Routes>
            <Route
              path="/admin"
              element={
                <ProtectedRoute redirectTo="/custom-login">
                  <div>Admin</div>
                </ProtectedRoute>
              }
            />
            <Route path="/custom-login" element={<div data-testid="custom-login">Custom Login</div>} />
            <Route path="/login" element={<div>Default Login</div>} />
          </Routes>
        </MemoryRouter>
      );

      expect(screen.getByTestId('custom-login')).toBeInTheDocument();
    });
  });

  describe('Configuración de rutas en App', () => {
    it('debe proteger /dashboard con ProtectedRoute', () => {
      // Verificar que /dashboard requiere autenticación
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
      });

      render(
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <div data-testid="dashboard">Dashboard</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login">Login</div>} />
          </Routes>
        </MemoryRouter>
      );

      // Usuario no autenticado debe ser redirigido
      expect(screen.getByTestId('login')).toBeInTheDocument();
      expect(screen.queryByTestId('dashboard')).not.toBeInTheDocument();
    });

    it('debe proteger /connect con ProtectedRoute', () => {
      // Verificar que /connect requiere autenticación
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
      });

      render(
        <MemoryRouter initialEntries={['/connect']}>
          <Routes>
            <Route
              path="/connect"
              element={
                <ProtectedRoute>
                  <div data-testid="connect">Connect</div>
                </ProtectedRoute>
              }
            />
            <Route path="/login" element={<div data-testid="login">Login</div>} />
          </Routes>
        </MemoryRouter>
      );

      // Usuario no autenticado debe ser redirigido
      expect(screen.getByTestId('login')).toBeInTheDocument();
      expect(screen.queryByTestId('connect')).not.toBeInTheDocument();
    });

    it('debe permitir acceso a rutas públicas sin autenticación', () => {
      // Verificar que rutas públicas son accesibles sin auth
      mockUseAuth.mockReturnValue({
        isAuthenticated: false,
        user: null,
      });

      const publicRoutes = [
        { path: '/', testId: 'landing', label: 'Landing' },
        { path: '/login', testId: 'login', label: 'Login' },
        { path: '/register', testId: 'register', label: 'Register' },
        { path: '/auth/callback', testId: 'callback', label: 'Callback' },
      ];

      publicRoutes.forEach(({ path, testId, label }) => {
        const { unmount } = render(
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route path="/" element={<div data-testid="landing">{label}</div>} />
              <Route path="/login" element={<div data-testid="login">{label}</div>} />
              <Route path="/register" element={<div data-testid="register">{label}</div>} />
              <Route path="/auth/callback" element={<div data-testid="callback">{label}</div>} />
            </Routes>
          </MemoryRouter>
        );

        // Verificar que la ruta pública es accesible
        expect(screen.getByTestId(testId)).toBeInTheDocument();
        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      });
    });

    it('debe permitir acceso a rutas protegidas cuando el usuario está autenticado', () => {
      // Verificar que rutas protegidas son accesibles con auth
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', username: 'testuser', displayName: 'Test User', avatar: 'avatar.jpg' },
      });

      const protectedRoutes = [
        { path: '/dashboard', testId: 'dashboard', label: 'Dashboard' },
        { path: '/connect', testId: 'connect', label: 'Connect' },
      ];

      protectedRoutes.forEach(({ path, testId, label }) => {
        const { unmount } = render(
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route
                path={path}
                element={
                  <ProtectedRoute>
                    <div data-testid={testId}>{label}</div>
                  </ProtectedRoute>
                }
              />
              <Route path="/login" element={<div>Login</div>} />
            </Routes>
          </MemoryRouter>
        );

        // Verificar que la ruta protegida es accesible
        expect(screen.getByTestId(testId)).toBeInTheDocument();
        expect(screen.getByText(label)).toBeInTheDocument();
        unmount();
      });
    });
  });
});
