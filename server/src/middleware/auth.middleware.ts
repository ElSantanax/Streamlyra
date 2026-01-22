import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        username: string;
    }
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    // Buscar en Header 'Authorization: Bearer <token>' o en custom header 'x-user-id' (retrocompatibilidad temporal)
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    const legacyUserId = req.headers['x-user-id'];

    if (!token) {
        // Fallback temporal para permitir pruebas sin haber migrado todo el frontend a Bearer token
        if (legacyUserId) {
            req.user = { id: legacyUserId as string, username: 'legacy' };
            return next();
        }
        return res.status(401).json({ error: 'Acceso denegado. Token no proporcionado.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        req.user = {
            id: decoded.id,
            username: decoded.username
        };
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido o expirado.' });
    }
};

export const optionalAuthenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
        req.user = {
            id: decoded.id,
            username: decoded.username
        };
        next();
    } catch (error) {
        // En opcional no bloqueamos, solo ignoramos el token inválido
        next();
    }
};
