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
