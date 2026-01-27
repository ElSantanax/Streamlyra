import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { renderHook } from '@testing-library/react';
import { useAuth } from '../useAuth';
import { useNavigate } from 'react-router-dom';

// Mock dependencies
vi.mock('react-router-dom', () => ({
    useNavigate: vi.fn(),
}));

vi.mock('../../api/services/auth.service', () => ({
    authService: {
        getMe: vi.fn(),
        logout: vi.fn(),
    },
}));

vi.mock('../../services/AuthService', () => ({
    authService: {
        clearLocalSession: vi.fn(),
    },
}));

describe('useAuth Property-based Tests', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
        (useNavigate as any).mockReturnValue(vi.fn());
    });

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
                const { result } = renderHook(() => useAuth());

                // Simular login con datos aleatorios
                // Note: En el nuevo flujo, el token viene en la cookie, 
                // pero queremos asegurar que useAuth no lo guarde si por error se le pasa
                await vi.waitFor(() => {
                    result.current.login(userData as any);
                });

                // Verificación 1: El estado del usuario no debe tener el campo token si es que existía
                // (dependiendo de cómo hayamos implementado login, pero el requisito es robustez)
                const storedUser = JSON.parse(localStorage.getItem('user') || '{}');

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

                const { result } = renderHook(() => useAuth());

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
        const { result } = renderHook(() => useAuth());

        const expectedMethods = ['login', 'logout', 'checkAuth', 'requireAuth'];
        const expectedStates = ['user', 'isAuthenticated', 'isChecking'];

        expectedMethods.forEach(method => {
            expect(typeof (result.current as any)[method]).toBe('function');
        });

        expectedStates.forEach(state => {
            expect((result.current as any)[state]).toBeDefined();
        });
    });
});
