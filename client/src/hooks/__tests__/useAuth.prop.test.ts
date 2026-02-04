import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { AuthProvider } from '../../context/AuthProvider';
import { useAuth } from '../useAuth';
import type { User } from '../../types/user.types';

// Mock dependencies
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return {
        ...actual,
        useNavigate: vi.fn(),
    };
});

vi.mock('../../services/api/auth.service', () => ({
    authService: {
        getMe: vi.fn(),
        logout: vi.fn(),
    },
}));

vi.mock('../../services/session', () => ({
    sessionManager: {
        clearLocalSession: vi.fn(),
        setSessionExpiredHandler: vi.fn(),
    },
}));

describe('useAuth Property-based Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        vi.mocked(useNavigate).mockReturnValue(vi.fn());
    });

    const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(
            MemoryRouter,
            { initialEntries: ['/dashboard'] },
            React.createElement(AuthProvider, null, children)
        );

    /**
     * Feature: client-security-robustness
     * Property 13: Almacenamiento de perfil sin token
     * Valida Requisito 3.4: El estado local nunca debe contener el token
     */
    it('Property 13: el estado local y el hook nunca deben exponer o guardar un campo "token"', async () => {
        const userArb = fc.record({
            id: fc.uuid(),
            username: fc.string(),
            email: fc.emailAddress(),
            // Intentamos "colar" un token en los datos aleatorios
            token: fc.oneof(fc.string(), fc.constant(undefined)),
            arbitrary: fc.dictionary(fc.string(), fc.anything())
        });

        await fc.assert(
            fc.asyncProperty(userArb, async (userData) => {
                const { result } = renderHook(() => useAuth(), { wrapper });

                // Simular login con datos aleatorios
                // Note: En el nuevo flujo, el token viene en la cookie, 
                // pero queremos asegurar que useAuth no lo guarde si por error se le pasa
                await vi.waitFor(() => {
                    result.current.login(userData as unknown as User);
                });

                // Verificación 1: El estado del usuario no debe tener el campo token si es que existía
                // (dependiendo de cómo hayamos implementado login, pero el requisito es robustez)
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}') as Record<string, unknown>;

                // LA PROPIEDAD: No debe existir rastro del token en localStorage
                expect(storedUser.token).toBeUndefined();
                expect(localStorage.getItem('token')).toBeNull();

                return true;
            }),
            { numRuns: 50 }
        );
    });

    /**
     * Property 16: Validación de autenticación basada en estado de usuario
     * Valida que isAuthenticated sea un reflejo fiel de la existencia del objeto user (y nada más)
     */
    it('Property 16: isAuthenticated debe ser un booleano derivado exclusivamente de la presencia de user', async () => {
        await fc.assert(
            fc.property(fc.oneof(fc.constant(null), fc.object()), (userValue) => {
                localStorage.clear();
                if (userValue) {
                    localStorage.setItem('user', JSON.stringify(userValue));
                }

                const { result } = renderHook(() => useAuth(), { wrapper });

                // LA PROPIEDAD: isAuthenticated debe coincidir con la lógica !!user
                const expected = !!userValue;
                expect(result.current.isAuthenticated).toBe(expected);

                return result.current.isAuthenticated === expected;
            })
        );
    });

    /**
     * Property 18: Preservación de API pública de useAuth
     * Asegura que a pesar de la refactorización, los métodos esperados existen y son funciones
     */
    it('Property 18: debe mantener la firma pública esperada para compatibilidad', () => {
        const { result } = renderHook(() => useAuth(), { wrapper });

        const expectedMethods = ['login', 'logout', 'checkAuth', 'requireAuth'];
        const expectedStates = ['user', 'isAuthenticated', 'isChecking'];

        expectedMethods.forEach(method => {
            expect(typeof result.current[method as keyof typeof result.current]).toBe('function');
        });

        expectedStates.forEach(state => {
            expect(result.current[state as keyof typeof result.current]).toBeDefined();
        });
    });
});
