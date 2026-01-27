/**
 * Hook genérico para sincronizar estado con localStorage
 * Evita duplicación de lógica de lectura/escritura
 */

import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  parser?: (value: string) => T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  // Estado inicial desde localStorage
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return initialValue;

      // Usar parser personalizado si se proporciona
      if (parser) {
        return parser(item);
      }

      // Intentar parsear como JSON primero
      try {
        return JSON.parse(item) as T;
      } catch {
        // Si falla el parseo, pero el initialValue es string o null,
        // asumimos que es un string plano (como un token antiguo o manual)
        if (typeof initialValue === 'string' || initialValue === null) {
          return item as unknown as T;
        }
        // Si no es un string y falló el parseo, lanzamos para que lo maneje el catch principal
        throw new Error('Not valid JSON');
      }
    } catch (error) {
      // Solo loguear si no es un error de parseo esperado para strings
      if (!(error instanceof SyntaxError && (typeof initialValue === 'string' || initialValue === null))) {
        console.error(`Error reading localStorage key "${key}":`, error);
      }

      // Si el valor era realmente inválido para el tipo esperado (no string/null), lo limpiamos
      if (typeof initialValue !== 'string' && initialValue !== null) {
        localStorage.removeItem(key);
      }

      return initialValue;
    }
  });

  // Actualizar localStorage cuando cambia el estado
  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);

        if (valueToStore === null || valueToStore === undefined) {
          localStorage.removeItem(key);
        } else {
          localStorage.setItem(key, JSON.stringify(valueToStore));
        }
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue]
  );

  // Función para limpiar el valor
  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

  // Sincronizar con cambios en otras pestañas
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === key && e.newValue !== null) {
        try {
          if (parser) {
            setStoredValue(parser(e.newValue));
          } else {
            try {
              setStoredValue(JSON.parse(e.newValue) as T);
            } catch {
              if (typeof initialValue === 'string' || initialValue === null) {
                setStoredValue(e.newValue as unknown as T);
              } else {
                throw new Error('Not valid JSON');
              }
            }
          }
        } catch (error) {
          if (!(error instanceof SyntaxError && (typeof initialValue === 'string' || initialValue === null))) {
            console.error(`Error syncing localStorage key "${key}":`, error);
          }
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, parser]);

  return [storedValue, setValue, removeValue];
}
