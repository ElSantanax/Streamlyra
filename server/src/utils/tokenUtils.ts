import crypto from 'crypto';

/** Utilidades para manejo de tokens OAuth */

export function calculateTokenExpiry(expiresIn: number): Date {
    return new Date(Date.now() + expiresIn * 1000);
}

export function hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
}
