import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError';

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

    if (!token) {
        throw new AppError('Acceso denegado. Token no proporcionado.', 401);
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string, username: string };
        req.user = {
            id: decoded.id,
            username: decoded.username
        };
        next();
    } catch {
        throw new AppError('Token inválido o expirado.', 403);
    }
};

export const optionalAuthenticate = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return next();
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: string, username: string };
        req.user = {
            id: decoded.id,
            username: decoded.username
        };
        next();
    } catch {
        // En opcional no bloqueamos, solo ignoramos el token inválido
        next();
    }
};
