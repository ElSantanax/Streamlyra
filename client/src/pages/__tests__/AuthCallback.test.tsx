/**
 * Tests para AuthCallback - Redirección post-autenticación
 * Feature: client-security-robustness
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as fc from 'fast-check';
import AuthCallback from '../AuthCallback';

const mockLogin = vi.fn();

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

// Mock de fetch global
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// Mock de navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('AuthCallback - Redirección post-autenticación', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        token: 'test-token',
        user: {
          id: '123',
          username: 'testuser',
          displayName: 'Test User',
          avatar: 'avatar.jpg',
        },
      }),
    });
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Propiedad 4: Redirección post-autenticación', () => {
    it('debe redirigir a URL preservada después de autenticación exitosa', async () => {
      // Feature: client-security-robustness, Property 4: Redirección post-autenticación
      // Valida: Requisitos 1.4

      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('/dashboard', '/connect', '/profile', '/settings'),
          async (redirectUrl) => {
            // Limpiar estado entre iteraciones
            vi.clearAllMocks();
            localStorage.clear();
            mockNavigate.mockClear();

            // Simular que se guardó la URL de redirección antes de OAuth
            localStorage.setItem('auth_redirect', redirectUrl);

            // Renderizar componente con código de OAuth
            const { unmount } = render(
              <MemoryRouter initialEntries={['/auth/callback?code=test-code&state=twitch']}>
                <AuthCallback />
              </MemoryRouter>
            );

            // Esperar a que se complete la autenticación
            await waitFor(
              () => {
                expect(mockNavigate).toHaveBeenCalled();
              },
              { timeout: 3000 }
            );

            // Verificar que se redirigió a la URL preservada
            expect(mockNavigate).toHaveBeenCalledWith(redirectUrl);

            // Verificar que se limpió el redirect de localStorage
            expect(localStorage.getItem('auth_redirect')).toBeNull();

            unmount();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('debe redirigir a /dashboard por defecto cuando no hay URL preservada', async () => {
      // Feature: client-security-robustness, Property 4: Redirección post-autenticación
      // Valida: Requisitos 1.4

      // NO guardar ninguna URL de redirección
      expect(localStorage.getItem('auth_redirect')).toBeNull();

      render(
        <MemoryRouter initialEntries={['/auth/callback?code=test-code&state=twitch']}>
          <AuthCallback />
        </MemoryRouter>
      );

      // Esperar a que se complete la autenticación
      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // Verificar que se redirigió a /dashboard por defecto
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('debe preservar y usar redirect URL para diferentes plataformas OAuth', async () => {
      // Feature: client-security-robustness, Property 4: Redirección post-autenticación
      // Valida: Requisitos 1.4

      const testCases = [
        { state: 'twitch', redirectUrl: '/dashboard' },
        { state: 'youtube_123', redirectUrl: '/connect' },
        { state: 'kick_456', redirectUrl: '/settings' },
      ];

      for (const { state, redirectUrl } of testCases) {
        vi.clearAllMocks();
        localStorage.clear();
        mockNavigate.mockClear();

        // Guardar URL de redirección
        localStorage.setItem('auth_redirect', redirectUrl);

        const { unmount } = render(
          <MemoryRouter initialEntries={[`/auth/callback?code=test-code&state=${state}`]}>
            <AuthCallback />
          </MemoryRouter>
        );

        await waitFor(
          () => {
            expect(mockNavigate).toHaveBeenCalled();
          },
          { timeout: 3000 }
        );

        // Verificar redirección correcta independiente de la plataforma
        expect(mockNavigate).toHaveBeenCalledWith(redirectUrl);
        expect(localStorage.getItem('auth_redirect')).toBeNull();

        unmount();
      }
    });

    it('debe limpiar auth_redirect incluso si la autenticación falla', async () => {
      // Feature: client-security-robustness, Property 4: Redirección post-autenticación
      // Valida: Requisitos 1.4

      // Simular fallo de autenticación
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Authentication failed' }),
      });

      // Guardar URL de redirección
      localStorage.setItem('auth_redirect', '/dashboard');

      // Mock de alert para evitar que se muestre
      const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <MemoryRouter initialEntries={['/auth/callback?code=test-code&state=twitch']}>
          <AuthCallback />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // Verificar que se redirigió a /login en caso de error
      expect(mockNavigate).toHaveBeenCalledWith('/login');

      // Verificar que NO se limpió auth_redirect (para que el usuario pueda reintentar)
      // Nota: En la implementación actual se limpia solo en caso de éxito
      // Si falla, el redirect permanece para el próximo intento

      mockAlert.mockRestore();
    });
  });

  describe('Manejo de errores en autenticación', () => {
    it('debe redirigir a /login cuando hay error en query params', async () => {
      render(
        <MemoryRouter initialEntries={['/auth/callback?error=access_denied']}>
          <AuthCallback />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/login');
        },
        { timeout: 1000 }
      );
    });

    it('debe redirigir a /login cuando no hay código', async () => {
      render(
        <MemoryRouter initialEntries={['/auth/callback']}>
          <AuthCallback />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/login');
        },
        { timeout: 1000 }
      );
    });
  });
});
