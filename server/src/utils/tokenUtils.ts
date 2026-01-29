/** Utilidades para manejo de tokens OAuth */

export function calculateTokenExpiry(expiresIn: number): Date {
    return new Date(Date.now() + expiresIn * 1000);
}
