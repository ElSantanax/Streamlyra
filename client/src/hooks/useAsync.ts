/**
 * Hook genérico para operaciones asíncronas
 * Patrón: [data, loading, error] reutilizable
 */

import { useState, useCallback, useEffect, useRef } from 'react';

interface UseAsyncOptions<T> {
  immediate?: boolean;
  initialArgs?: unknown[];
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

interface UseAsyncReturn<T, Args extends unknown[]> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
}

export function useAsync<T, Args extends unknown[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  options: UseAsyncOptions<T> = {}
): UseAsyncReturn<T, Args> {
  const { immediate = false, initialArgs = [], onSuccess, onError } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Usar ref para evitar problemas con closures
  const asyncFunctionRef = useRef(asyncFunction);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  // Mantener refs actualizados
  useEffect(() => {
    asyncFunctionRef.current = asyncFunction;
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [asyncFunction, onSuccess, onError]);

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await asyncFunctionRef.current(...args);
        setData(result);
        onSuccessRef.current?.(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        onErrorRef.current?.(error);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
  }, []);

  // Ejecutar inmediatamente si se especifica
  useEffect(() => {
    if (immediate) {
      execute(...(initialArgs as Args));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Solo ejecutar en mount

  return { data, isLoading, error, execute, reset };
}
