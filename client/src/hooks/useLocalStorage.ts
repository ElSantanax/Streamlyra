import { useState, useEffect, useCallback } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  parser?: (value: string) => T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return initialValue;

      if (parser) {
        return parser(item);
      }

      try {
        return JSON.parse(item) as T;
      } catch {
        if (typeof initialValue === 'string' || initialValue === null) {
          return item as unknown as T;
        }
        throw new Error('Not valid JSON');
      }
    } catch (error) {
      if (!(error instanceof SyntaxError && (typeof initialValue === 'string' || initialValue === null))) {
        console.error(`Error reading localStorage key "${key}":`, error);
      }

      if (typeof initialValue !== 'string' && initialValue !== null) {
        localStorage.removeItem(key);
      }

      return initialValue;
    }
  });

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        setStoredValue((prevValue) => {
          const valueToStore = value instanceof Function ? value(prevValue) : value;

          if (valueToStore === null || valueToStore === undefined) {
            localStorage.removeItem(key);
          } else {
            localStorage.setItem(key, JSON.stringify(valueToStore));
          }

          return valueToStore;
        });
      } catch (error) {
        console.error(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key]
  );

  const removeValue = useCallback(() => {
    try {
      localStorage.removeItem(key);
      setStoredValue(initialValue);
    } catch (error) {
      console.error(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, initialValue]);

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