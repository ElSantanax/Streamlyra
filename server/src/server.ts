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
    twitchManager
} = container;

const app = createApp(authController, webhookController);

const server = http.createServer(app);
io.attach(server);

setupSocketHandlers(io, chatManager, messageSenderService, connectionService, youtubeService);

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

(async () => {
    try {
        await twitchManager.syncSubscriptionsOnStartup();
    } catch (err) {
        logger.error({ err }, 'Twitch Startup: Error fatal en la sincronización inicial');
    }
})();

export { app, io, chatManager, connectToDatabase };
export default server;