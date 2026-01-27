/**
 * Generadores personalizados para property-based testing con fast-check
 * Estos generadores crean datos aleatorios pero válidos para testing
 */

import * as fc from 'fast-check';
import type { User } from '../types';

/**
 * Generador de objetos User válidos
 */
export const userArbitrary = (): fc.Arbitrary<User> => {
  return fc.record({
    id: fc.uuid(),
    username: fc.string({ minLength: 3, maxLength: 20 }).filter(s => /^[a-zA-Z0-9_]+$/.test(s)),
    displayName: fc.string({ minLength: 3, maxLength: 30 }),
    avatar: fc.webUrl(),
  });
};

/**
 * Generador de URLs de rutas válidas de la aplicación
 */
export const routePathArbitrary = (): fc.Arbitrary<string> => {
  return fc.oneof(
    fc.constant('/'),
    fc.constant('/login'),
    fc.constant('/register'),
    fc.constant('/dashboard'),
    fc.constant('/connect'),
    fc.constant('/auth/callback'),
    fc.string({ minLength: 1, maxLength: 50 }).map(s => `/${s.replace(/\//g, '-')}`)
  );
};

/**
 * Generador de estados de autenticación
 */
export const authStateArbitrary = () => {
  return fc.record({
    isAuthenticated: fc.boolean(),
    user: fc.option(userArbitrary(), { nil: null }),
  });
};

/**
 * Generador de tokens JWT simulados (solo para testing)
 */
export const tokenArbitrary = (): fc.Arbitrary<string> => {
  return fc.string({ minLength: 20, maxLength: 200 });
};

/**
 * Generador de errores de JavaScript
 */
export const errorArbitrary = (): fc.Arbitrary<Error> => {
  return fc.record({
    name: fc.constantFrom('Error', 'TypeError', 'ReferenceError', 'RangeError'),
    message: fc.string({ minLength: 10, maxLength: 100 }).filter(msg => 
      // Filtrar mensajes que puedan causar problemas
      msg.trim().length > 0 && 
      !msg.includes('__') && 
      !/^[^a-zA-Z0-9]/.test(msg)
    ),
  }).map(({ name, message }) => {
    const error = new Error(message);
    error.name = name;
    return error;
  });
};

/**
 * Generador de códigos de estado HTTP
 */
export const httpStatusArbitrary = (): fc.Arbitrary<number> => {
  return fc.oneof(
    fc.constantFrom(200, 201, 204), // Success
    fc.constantFrom(400, 401, 403, 404), // Client errors
    fc.constantFrom(500, 502, 503) // Server errors
  );
};
