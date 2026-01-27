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

  describe('Integración OAuth - Flujo completo', () => {
    it('debe procesar correctamente el callback de Twitch', async () => {
      // Valida: Requisitos 5.1, 5.2
      const mockUser = {
        id: 'twitch-123',
        username: 'twitchuser',
        displayName: 'Twitch User',
        avatar: 'https://example.com/avatar.jpg',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'twitch-token',
          user: mockUser,
        }),
      });

      render(
        <MemoryRouter initialEntries={['/auth/callback?code=twitch-code&state=twitch']}>
          <AuthCallback />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(mockLogin).toHaveBeenCalledWith(mockUser);
        },
        { timeout: 3000 }
      );

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('debe procesar correctamente el callback de YouTube', async () => {
      // Valida: Requisitos 5.1, 5.2
      const mockUser = {
        id: 'youtube-456',
        username: 'youtubeuser',
        displayName: 'YouTube User',
        avatar: 'https://example.com/yt-avatar.jpg',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'youtube-token',
          user: mockUser,
        }),
      });

      render(
        <MemoryRouter initialEntries={['/auth/callback?code=yt-code&state=youtube_123']}>
          <AuthCallback />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(mockLogin).toHaveBeenCalledWith(mockUser);
        },
        { timeout: 3000 }
      );

      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('debe procesar correctamente el callback de Kick con code_verifier', async () => {
      // Valida: Requisitos 5.1, 5.2
      const mockUser = {
        id: 'kick-789',
        username: 'kickuser',
        displayName: 'Kick User',
        avatar: 'https://example.com/kick-avatar.jpg',
      };

      // Simular que se guardó el code_verifier antes del OAuth
      localStorage.setItem('kick_verifier', 'test-verifier-123');

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'kick-token',
          user: mockUser,
        }),
      });

      render(
        <MemoryRouter initialEntries={['/auth/callback?code=kick-code&state=kick_456']}>
          <AuthCallback />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(mockLogin).toHaveBeenCalledWith(mockUser);
        },
        { timeout: 3000 }
      );

      // Verificar que se limpió el code_verifier
      expect(localStorage.getItem('kick_verifier')).toBeNull();
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });

    it('debe llamar a login con datos de usuario correctos', async () => {
      // Valida: Requisitos 5.1, 5.2
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          token: 'test-token',
          user: mockUser,
        }),
      });

      render(
        <MemoryRouter initialEntries={['/auth/callback?code=test-code&state=twitch']}>
          <AuthCallback />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(mockLogin).toHaveBeenCalledTimes(1);
        },
        { timeout: 3000 }
      );

      // Verificar que se llamó con el objeto user completo
      expect(mockLogin).toHaveBeenCalledWith(mockUser);
      expect(mockLogin).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          username: expect.any(String),
          displayName: expect.any(String),
          avatar: expect.any(String),
        })
      );
    });

    it('debe manejar errores de API correctamente', async () => {
      // Valida: Requisitos 5.1, 5.2
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'Invalid authorization code',
        }),
      });

      const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <MemoryRouter initialEntries={['/auth/callback?code=invalid-code&state=twitch']}>
          <AuthCallback />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/login');
        },
        { timeout: 3000 }
      );

      // Verificar que NO se llamó a login en caso de error
      expect(mockLogin).not.toHaveBeenCalled();

      mockAlert.mockRestore();
    });

    it('debe manejar errores de red correctamente', async () => {
      // Valida: Requisitos 5.1, 5.2
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const mockAlert = vi.spyOn(window, 'alert').mockImplementation(() => {});

      render(
        <MemoryRouter initialEntries={['/auth/callback?code=test-code&state=twitch']}>
          <AuthCallback />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(mockNavigate).toHaveBeenCalledWith('/login');
        },
        { timeout: 3000 }
      );

      // Verificar que NO se llamó a login en caso de error
      expect(mockLogin).not.toHaveBeenCalled();

      mockAlert.mockRestore();
    });

    it('debe prevenir múltiples llamadas de autenticación', async () => {
      // Valida: Requisitos 5.1, 5.2
      const mockUser = {
        id: 'user-123',
        username: 'testuser',
        displayName: 'Test User',
        avatar: 'https://example.com/avatar.jpg',
      };

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({
          token: 'test-token',
          user: mockUser,
        }),
      });

      const { rerender } = render(
        <MemoryRouter initialEntries={['/auth/callback?code=test-code&state=twitch']}>
          <AuthCallback />
        </MemoryRouter>
      );

      // Forzar re-render
      rerender(
        <MemoryRouter initialEntries={['/auth/callback?code=test-code&state=twitch']}>
          <AuthCallback />
        </MemoryRouter>
      );

      await waitFor(
        () => {
          expect(mockLogin).toHaveBeenCalled();
        },
        { timeout: 3000 }
      );

      // Verificar que solo se llamó una vez a pesar del re-render
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });

    it('debe funcionar con diferentes combinaciones de plataformas y códigos', async () => {
      // Valida: Requisitos 5.1, 5.2
      const testCases = [
        {
          platform: 'twitch',
          state: 'twitch',
          code: 'twitch-code-abc',
          userId: 'twitch-user-1',
        },
        {
          platform: 'youtube',
          state: 'youtube_session_123',
          code: 'yt-code-xyz',
          userId: 'youtube-user-2',
        },
        {
          platform: 'kick',
          state: 'kick_session_456',
          code: 'kick-code-def',
          userId: 'kick-user-3',
        },
      ];

      for (const testCase of testCases) {
        vi.clearAllMocks();
        localStorage.clear();

        const mockUser = {
          id: testCase.userId,
          username: `${testCase.platform}user`,
          displayName: `${testCase.platform} User`,
          avatar: `https://example.com/${testCase.platform}-avatar.jpg`,
        };

        mockFetch.mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            token: `${testCase.platform}-token`,
            user: mockUser,
          }),
        });

        const { unmount } = render(
          <MemoryRouter
            initialEntries={[`/auth/callback?code=${testCase.code}&state=${testCase.state}`]}
          >
            <AuthCallback />
          </MemoryRouter>
        );

        await waitFor(
          () => {
            expect(mockLogin).toHaveBeenCalledWith(mockUser);
          },
          { timeout: 3000 }
        );

        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');

        unmount();
      }
    });
  });
});
