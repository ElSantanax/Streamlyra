/**
 * Tests para PlatformConnection - Preservación de redirect
 * Feature: client-security-robustness
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as fc from 'fast-check';
import userEvent from '@testing-library/user-event';
import PlatformConnection from '../PlatformConnection';

// Mock de navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// Mock de useAuth
const mockUseAuth = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => mockUseAuth(),
}));

// Mock de window.location
const originalLocation = window.location;
delete (window as unknown as { location: unknown }).location;
(window as unknown as { location: Location }).location = { href: 'http://localhost:3000' } as Location;

describe('PlatformConnection - Preservación de redirect', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    // Por defecto, usuario NO autenticado
    mockUseAuth.mockReturnValue({
      isAuthenticated: false,
      user: null,
    });
  });

  afterEach(() => {
    localStorage.clear();
    (window as unknown as { location: Location }).location = originalLocation;
  });

  describe('Propiedad 4: Preservación de URL para redirección post-auth', () => {
    it('debe guardar parámetro redirect en localStorage antes de OAuth', async () => {
      // Feature: client-security-robustness, Property 4: Redirección post-autenticación
      // Valida: Requisitos 1.4

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('/dashboard', '/connect', '/profile', '/settings', '/admin'),
          async (redirectUrl) => {
            // Limpiar estado entre iteraciones
            localStorage.clear();
            window.location.href = 'http://localhost:3000';

            const user = userEvent.setup();

            // Renderizar con parámetro redirect en URL
            const { unmount } = render(
              <MemoryRouter initialEntries={[`/login?redirect=${encodeURIComponent(redirectUrl)}`]}>
                <PlatformConnection />
              </MemoryRouter>
            );

            // Buscar y hacer click en el botón de Twitch
            const twitchButton = screen.getByText(/Iniciar Sesión con Twitch/i);
            await user.click(twitchButton);

            // Verificar que se guardó el redirect en localStorage
            expect(localStorage.getItem('auth_redirect')).toBe(redirectUrl);

            // Verificar que se inició el flujo OAuth (window.location.href cambió)
            expect(window.location.href).toContain('twitch.tv/oauth2/authorize');

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('NO debe guardar nada en localStorage si no hay parámetro redirect', async () => {
      // Feature: client-security-robustness, Property 4: Redirección post-autenticación
      // Valida: Requisitos 1.4

      const user = userEvent.setup();

      // Renderizar SIN parámetro redirect
      render(
        <MemoryRouter initialEntries={['/login']}>
          <PlatformConnection />
        </MemoryRouter>
      );

      // Hacer click en el botón de Twitch
      const twitchButton = screen.getByText(/Iniciar Sesión con Twitch/i);
      await user.click(twitchButton);

      // Verificar que NO se guardó nada en localStorage
      expect(localStorage.getItem('auth_redirect')).toBeNull();
    });

    it('debe preservar redirect con caracteres especiales correctamente', async () => {
      // Feature: client-security-robustness, Property 4: Redirección post-autenticación
      // Valida: Requisitos 1.4

      const testCases = [
        '/dashboard?tab=analytics',
        '/profile?section=settings&theme=dark',
        '/connect?platform=youtube',
      ];

      for (const redirectUrl of testCases) {
        localStorage.clear();
        window.location.href = 'http://localhost:3000';

        const user = userEvent.setup();

        const { unmount } = render(
          <MemoryRouter initialEntries={[`/login?redirect=${encodeURIComponent(redirectUrl)}`]}>
            <PlatformConnection />
          </MemoryRouter>
        );

        const twitchButton = screen.getByText(/Iniciar Sesión con Twitch/i);
        await user.click(twitchButton);

        // Verificar que se guardó correctamente (sin doble encoding)
        expect(localStorage.getItem('auth_redirect')).toBe(redirectUrl);

        unmount();
      }
    });
  });

  describe('Redirección de usuarios autenticados', () => {
    it('debe redirigir a /dashboard si el usuario ya está autenticado', () => {
      // Simular usuario autenticado
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', username: 'testuser', displayName: 'Test User', avatar: 'avatar.jpg' },
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <PlatformConnection />
        </MemoryRouter>
      );

      // Verificar que se llamó navigate con /dashboard y replace: true
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });

    it('debe redirigir a /dashboard desde /register si ya está autenticado', () => {
      // Simular usuario autenticado
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', username: 'testuser', displayName: 'Test User', avatar: 'avatar.jpg' },
      });

      render(
        <MemoryRouter initialEntries={['/register']}>
          <PlatformConnection />
        </MemoryRouter>
      );

      // Verificar que se llamó navigate con /dashboard y replace: true
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });

    it('NO debe redirigir desde /connect si ya está autenticado', () => {
      // Simular usuario autenticado
      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', username: 'testuser', displayName: 'Test User', avatar: 'avatar.jpg' },
      });

      render(
        <MemoryRouter initialEntries={['/connect']}>
          <PlatformConnection />
        </MemoryRouter>
      );

      // Verificar que NO se llamó navigate (porque /connect es para agregar plataformas adicionales)
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  describe('Propiedad 5: Prevención de acceso a páginas de auth cuando autenticado', () => {
    it('debe prevenir acceso a /login y /register para usuarios autenticados', async () => {
      // Feature: client-security-robustness, Property 5: Prevención de acceso a páginas de auth cuando autenticado
      // Valida: Requisitos 1.7

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('/login', '/register'),
          fc.record({
            id: fc.string({ minLength: 1, maxLength: 20 }),
            username: fc.string({ minLength: 3, maxLength: 20 }),
            displayName: fc.string({ minLength: 1, maxLength: 50 }),
            avatar: fc.webUrl(),
          }),
          async (authPage, user) => {
            // Limpiar estado entre iteraciones
            vi.clearAllMocks();
            mockNavigate.mockClear();

            // Simular usuario autenticado
            mockUseAuth.mockReturnValue({
              isAuthenticated: true,
              user,
            });

            const { unmount } = render(
              <MemoryRouter initialEntries={[authPage]}>
                <PlatformConnection />
              </MemoryRouter>
            );

            // Verificar que se redirigió a /dashboard
            expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });

            unmount();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('debe permitir acceso a /login y /register para usuarios NO autenticados', async () => {
      // Feature: client-security-robustness, Property 5: Prevención de acceso a páginas de auth cuando autenticado
      // Valida: Requisitos 1.7

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('/login', '/register'),
          async (authPage) => {
            // Limpiar estado entre iteraciones
            vi.clearAllMocks();
            mockNavigate.mockClear();

            // Simular usuario NO autenticado
            mockUseAuth.mockReturnValue({
              isAuthenticated: false,
              user: null,
            });

            const { unmount } = render(
              <MemoryRouter initialEntries={[authPage]}>
                <PlatformConnection />
              </MemoryRouter>
            );

            // Verificar que NO se redirigió (puede acceder a la página)
            expect(mockNavigate).not.toHaveBeenCalled();

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('debe usar replace: true para evitar loops de navegación', () => {
      // Feature: client-security-robustness, Property 5: Prevención de acceso a páginas de auth cuando autenticado
      // Valida: Requisitos 1.7

      mockUseAuth.mockReturnValue({
        isAuthenticated: true,
        user: { id: '1', username: 'test', displayName: 'Test', avatar: 'avatar.jpg' },
      });

      render(
        <MemoryRouter initialEntries={['/login']}>
          <PlatformConnection />
        </MemoryRouter>
      );

      // Verificar que se usó replace: true (no añade entrada al historial)
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard', { replace: true });
    });
  });
});
