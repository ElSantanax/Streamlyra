import http from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { logger } from './utils/logger';

import { connectToDatabase } from './config/database';
import { createContainer } from './services/container';
import { createApp } from './app';

import { setupSocketHandlers } from './socket/socket.handler';
import { YouTubeSubscriptionRenewer } from './services/cron/YouTubeSubscriptionRenewer';
import { MessageBatcher } from './utils/MessageBatcher';
import { TwitchManager } from './services/chat';

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
    webhookController
} = container;

const app = createApp(authController, webhookController);

const server = http.createServer(app);
io.attach(server);

setupSocketHandlers(io, chatManager, messageSenderService, connectionService, youtubeService);

MessageBatcher.getInstance().setIo(io);

const youtubeSubscriptionRenewer = new YouTubeSubscriptionRenewer();
youtubeSubscriptionRenewer.start();

(async () => {
    try {
        const twitchManager = new TwitchManager();
        await twitchManager.syncSubscriptionsOnStartup();
    } catch (err) {
        logger.error({ err }, 'Twitch Startup: Error fatal en la sincronización inicial');
    }
})();

export { app, io, chatManager, connectToDatabase };
export default server;