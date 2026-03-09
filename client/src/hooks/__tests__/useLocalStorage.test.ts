import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('useLocalStorage', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
    });

    it('debería inicializar con el valor por defecto si no hay nada en localStorage', () => {
        const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'));
        expect(result.current[0]).toBe('default-value');
    });

    it('debería inicializar con el valor guardado en localStorage', () => {
        localStorage.setItem('test-key', JSON.stringify('saved-value'));
        const { result } = renderHook(() => useLocalStorage('test-key', 'default-value'));
        expect(result.current[0]).toBe('saved-value');
    });

    it('debería actualizar localStorage al llamar a setValue', () => {
        const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
        
        act(() => {
            result.current[1]('new-value');
        });

        expect(result.current[0]).toBe('new-value');
        expect(localStorage.getItem('test-key')).toBe(JSON.stringify('new-value'));
    });

    it('debería eliminar el valor al llamar a removeValue', () => {
        const { result } = renderHook(() => useLocalStorage('test-key', 'initial'));
        
        act(() => {
            result.current[1]('something');
            result.current[2]();
        });

        expect(result.current[0]).toBe('initial');
        expect(localStorage.getItem('test-key')).toBeNull();
    });

    it('debería funcionar con objetos complejos', () => {
        const initial = { a: 1 };
        const { result } = renderHook(() => useLocalStorage('test-obj', initial));
        
        act(() => {
            result.current[1]({ a: 2 });
        });

        expect(result.current[0]).toEqual({ a: 2 });
        expect(JSON.parse(localStorage.getItem('test-obj')!)).toEqual({ a: 2 });
    });

    it('debería sincronizarse con otros cambios de storage (StorageEvent)', () => {
        const { result } = renderHook(() => useLocalStorage('test-sync', 'initial'));
        
        act(() => {
            const event = new StorageEvent('storage', {
                key: 'test-sync',
                newValue: JSON.stringify('external-update')
            });
            window.dispatchEvent(event);
        });

        expect(result.current[0]).toBe('external-update');
    });
});
