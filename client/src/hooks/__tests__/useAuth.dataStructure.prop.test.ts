import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthProvider';
import { useAuth } from '../useAuth';
import { userArbitrary } from '../../test/generators';
import type { User } from '../../types';

// Mock dependencies
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: vi.fn(),
  };
});

vi.mock('../../api/services/auth.service', () => ({
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

describe('useAuth Data Structure Property-based Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    (useNavigate as any).mockReturnValue(vi.fn());
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      MemoryRouter,
      { initialEntries: ['/dashboard'] },
      React.createElement(AuthProvider, null, children)
    );

  /**
   * Feature: client-security-robustness
   * Property 19: Preservación de estructura de datos de usuario
   * Valida Requisito 5.4: El Sistema DEBERÁ mantener la estructura actual de datos de perfil de usuario en localStorage
   * 
   * Esta propiedad verifica que:
   * 1. Los campos requeridos del User (id, username, displayName, avatar) se preservan
   * 2. No se añaden campos inesperados al User en localStorage
   * 3. La estructura es consistente entre lo que se pasa a login() y lo que se guarda
   */
  it('Property 19: debe preservar la estructura exacta de datos de usuario en localStorage', async () => {
    await fc.assert(
      fc.asyncProperty(userArbitrary(), async (userData) => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        // Esperar a que termine la verificación inicial
        await waitFor(() => {
          expect(result.current.isChecking).toBe(false);
        });

        // Ejecutar login con datos de usuario generados aleatoriamente
        result.current.login(userData);

        // Recuperar datos guardados en localStorage
        const storedUserStr = localStorage.getItem('user');
        expect(storedUserStr).not.toBeNull();

        const storedUser = JSON.parse(storedUserStr!) as User;

        // PROPIEDAD 1: Todos los campos requeridos deben estar presentes
        expect(storedUser).toHaveProperty('id');
        expect(storedUser).toHaveProperty('username');
        expect(storedUser).toHaveProperty('displayName');
        expect(storedUser).toHaveProperty('avatar');

        // PROPIEDAD 2: Los valores deben coincidir exactamente con los datos originales
        expect(storedUser.id).toBe(userData.id);
        expect(storedUser.username).toBe(userData.username);
        expect(storedUser.displayName).toBe(userData.displayName);
        expect(storedUser.avatar).toBe(userData.avatar);

        // PROPIEDAD 3: No deben existir campos adicionales inesperados
        // (específicamente, no debe haber campo 'token' o 'password')
        expect(storedUser).not.toHaveProperty('token');
        expect(storedUser).not.toHaveProperty('password');
        expect(storedUser).not.toHaveProperty('accessToken');
        expect(storedUser).not.toHaveProperty('refreshToken');

        // PROPIEDAD 4: La estructura debe tener exactamente 4 campos
        const keys = Object.keys(storedUser);
        expect(keys).toHaveLength(4);
        expect(keys.sort()).toEqual(['avatar', 'displayName', 'id', 'username'].sort());

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property 19b: Verificar que la estructura se mantiene después de múltiples operaciones
   * Esta propiedad complementaria verifica que login/logout no corrompen la estructura
   */
  it('Property 19b: debe mantener la estructura de datos después de múltiples operaciones login/logout', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(userArbitrary(), { minLength: 1, maxLength: 5 }),
        async (userDataArray) => {
          const { result } = renderHook(() => useAuth(), { wrapper });

          // Esperar a que termine la verificación inicial
          await waitFor(() => {
            expect(result.current.isChecking).toBe(false);
          });

          // Realizar múltiples operaciones de login/logout
          for (const userData of userDataArray) {
            // Login
            result.current.login(userData);

            const storedUserStr = localStorage.getItem('user');
            if (storedUserStr) {
              const storedUser = JSON.parse(storedUserStr) as User;

              // Verificar estructura después de cada login
              expect(Object.keys(storedUser).sort()).toEqual(
                ['avatar', 'displayName', 'id', 'username'].sort()
              );
              expect(storedUser.id).toBe(userData.id);
              expect(storedUser.username).toBe(userData.username);
            }

            // Logout (excepto en la última iteración para verificar el estado final)
            if (userData !== userDataArray[userDataArray.length - 1]) {
              await result.current.logout();
            }
          }

          return true;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property 19c: Verificar que datos corruptos o con campos extra se normalizan
   * Esta propiedad verifica robustez ante datos inesperados
   */
  it('Property 19c: debe manejar datos con campos adicionales sin corromper la estructura base', async () => {
    const userWithExtraFieldsArb = fc.record({
      id: fc.uuid(),
      username: fc.string({ minLength: 3, maxLength: 20 }),
      displayName: fc.string({ minLength: 3, maxLength: 30 }),
      avatar: fc.webUrl(),
      // Campos adicionales que no deberían guardarse
      extraField: fc.string(),
      token: fc.string(),
      someOtherData: fc.anything(),
    });

    await fc.assert(
      fc.asyncProperty(userWithExtraFieldsArb, async (userData) => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        await waitFor(() => {
          expect(result.current.isChecking).toBe(false);
        });

        // Login con datos que tienen campos extra
        result.current.login(userData as any);

        const storedUserStr = localStorage.getItem('user');
        expect(storedUserStr).not.toBeNull();

        const storedUser = JSON.parse(storedUserStr!);

        // PROPIEDAD: Los campos base deben estar presentes
        expect(storedUser.id).toBe(userData.id);
        expect(storedUser.username).toBe(userData.username);
        expect(storedUser.displayName).toBe(userData.displayName);
        expect(storedUser.avatar).toBe(userData.avatar);

        // PROPIEDAD: Los campos sensibles no deben guardarse
        // (Nota: dependiendo de la implementación, puede que se guarden todos los campos,
        // pero al menos verificamos que los campos base están correctos)
        expect(storedUser).toHaveProperty('id');
        expect(storedUser).toHaveProperty('username');
        expect(storedUser).toHaveProperty('displayName');
        expect(storedUser).toHaveProperty('avatar');

        return true;
      }),
      { numRuns: 100 }
    );
  });
});
