import http from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { logger } from './utils/logger';

import { connectToDatabase } from './config/db';
import { createContainer } from './services/container';
import { createApp } from './app';

import { setupSocketHandlers } from './socket/socket.handler';
import { YouTubeSubscriptionRenewer } from './services/cron/YouTubeSubscriptionRenewer';
import { ConnectionRepository } from './repositories/implementations/ConnectionRepository';
import { User } from './models/User.model';
import crypto from 'crypto';
import { hashToken } from './utils/tokenUtils';
import { encryptionService } from './services/security/EncryptionService';
import { Op } from 'sequelize';

const io = new Server({
    cors: {
        origin: config.frontendUrl,
        methods: ["GET", "POST"],
        credentials: true
    }
});

const container = createContainer(io);
const {
    chatManager,
    messageSenderService,
    connectionService,
    youtubeService,
    authController,
    webhookController,
    twitchManager,
    userService
} = container;

const app = createApp(authController, webhookController);

const server = http.createServer(app);
io.attach(server);

setupSocketHandlers(io, chatManager, messageSenderService, connectionService, youtubeService, userService);

const youtubeSubscriptionRenewer = new YouTubeSubscriptionRenewer();
youtubeSubscriptionRenewer.start();

let isShuttingDown = false;

export function gracefulShutdown(): void {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info('Iniciando cierre ordenado del servidor');
    youtubeSubscriptionRenewer.stop();
    ConnectionRepository.stopCleanup();
    server.close(() => {
        logger.info('Servidor HTTP cerrado');
        process.exit(0);
    });
}

export async function runStartupTasks(): Promise<void> {
    try {
        await twitchManager.syncSubscriptionsOnStartup();

        // Asegurar que todos los usuarios tengan un overlayToken y su Hash
        const usersToUpdate = await User.findAll({
            where: {
                [Op.or]: [
                    { overlayTokenHash: null },
                    { overlayToken: null }
                ]
            }
        });

        for (const user of usersToUpdate) {
            const rawToken = user.overlayToken || crypto.randomUUID();
            const encryptedToken = encryptionService.isEncrypted(rawToken)
                ? rawToken
                : encryptionService.encrypt(rawToken);
            const tokenHash = hashToken(encryptionService.isEncrypted(rawToken)
                ? encryptionService.decrypt(rawToken, `Startup migration for user ${user.id}`)
                : rawToken);

            user.overlayToken = encryptedToken;
            user.overlayTokenHash = tokenHash;
            await user.save();
            logger.info({ userId: user.id }, 'Generated/Updated overlayToken and Hash for user');
        }
    } catch (err) {
        logger.error({ err }, 'Startup Tasks: Error during initial synchronization');
    }
}

export { app, io, chatManager, connectToDatabase };
export default server;