import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../../config';
import { logger } from '../../utils/logger';
import { UserService } from '../../services/user/UserService';

export const createAuthMiddleware = (userService: UserService) => {
    return async (socket: Socket, next: (err?: Error) => void) => {
        // 1. Intentar autenticación por Overlay Token (prioritario para OBS)
        const overlayToken = (socket.handshake.auth.overlayToken as string | undefined) ||
            (socket.handshake.query.overlayToken as string | undefined);

        if (overlayToken) {
            try {
                const user = await userService.findByOverlayToken(overlayToken);
                if (user) {
                    const socketData = socket.data as { userId?: string; username?: string };
                    socketData.userId = user.id;
                    socketData.username = user.username;
                    logger.info({ socketId: socket.id, userId: user.id }, 'Socket authenticated via Overlay Token');
                    return next();
                }
                logger.warn({ socketId: socket.id, overlayToken }, 'Invalid Overlay Token attempt');
            } catch (err) {
                logger.error({ socketId: socket.id, err }, 'Error validating overlay token');
            }
        }

        // 2. Intentar autenticación por JWT (Dashboard y Web)
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
            const decoded = jwt.verify(token, config.jwtSecret) as { id: string; username: string };
            const socketData = socket.data as { userId?: string; username?: string };
            socketData.userId = decoded.id;
            socketData.username = decoded.username;
            next();
        } catch (err) {
            logger.warn({ socketId: socket.id, err }, 'Socket authentication failed');
            return next(new Error('Authentication error: Invalid token'));
        }
    };
};
