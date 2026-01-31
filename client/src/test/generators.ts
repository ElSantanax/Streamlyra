/**
 * Generadores personalizados para property-based testing con fast-check
 * Estos generadores crean datos aleatorios pero válidos para testing
 */

import * as fc from 'fast-check';
import type { User } from '../types';

/**
 * Generador de objetos User válidos
 * Genera objetos normales de JavaScript sin prototipos nulos
 */
export const userArbitrary = (): fc.Arbitrary<User> => {
  return fc.record({
    id: fc.uuid(),
    // Generar username alfanumérico que siempre empiece con 'user' para evitar conflictos
    username: fc.string({ minLength: 3, maxLength: 12, unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789'.split('')) })
      .map((s: string) => `user${s}`),
    // Generar displayName con caracteres seguros
    displayName: fc.string({ minLength: 3, maxLength: 30, unit: fc.constantFrom(...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 '.split('')) }),
    avatar: fc.webUrl(),
  }).map(user => {
    // Crear un objeto normal de JavaScript (no con __proto__: null)
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName.trim() || 'User',
      avatar: user.avatar,
    };
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
