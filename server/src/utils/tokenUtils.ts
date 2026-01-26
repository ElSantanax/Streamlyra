/**
 * Utilidades para manejo de tokens OAuth
 */

/**
 * Calcula la fecha de expiración de un token
 * @param expiresIn - Segundos hasta la expiración
 * @returns Fecha de expiración
 */
export function calculateTokenExpiry(expiresIn: number): Date {
    return new Date(Date.now() + expiresIn * 1000);
}
