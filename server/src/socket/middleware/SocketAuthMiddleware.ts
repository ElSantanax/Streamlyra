import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { logger } from '../../utils/logger';

export const createAuthMiddleware = () => {
    return (socket: Socket, next: (err?: Error) => void) => {
        let token = (socket.handshake.auth.token as string | undefined) || (socket.handshake.headers.authorization?.split(' ')[1]);

        if (!token) {
            const cookieHeader = socket.handshake.headers.cookie;
            if (cookieHeader) {
                const cookies = cookieHeader.split(';').reduce((acc, curr) => {
                    const [key, value] = curr.split('=').map(c => c.trim());
                    if (key && value) {
                        acc[key] = value;
                    }
                    return acc;
                }, {} as Record<string, string>);

                token = cookies['auth_token'];
            }
        }

        if (!token) {
            logger.warn({ socketId: socket.id }, 'Socket connection attempt without token');
            return next(new Error('Authentication error: Token required'));
        }

        try {
            const decoded = jwt.verify(token, config.jwtSecret) as { id: string };
            (socket.data as { userId?: string }).userId = decoded.id;
            next();
        } catch (err) {
            logger.warn({ socketId: socket.id, err }, 'Socket authentication failed');
            return next(new Error('Authentication error: Invalid token'));
        }
    };
};
