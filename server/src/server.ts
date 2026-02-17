/** Configuración del servidor Express y Socket.io con inyección de dependencias centralizada */

import http from 'http';
import { Server } from 'socket.io';
import { config } from './config';
import { logger } from './utils/logger';

// Loaders and Helpers
import { connectToDatabase } from './config/database';
import { createContainer } from './services/container';
import { createApp } from './app';

// Socket and Services
import { setupSocketHandlers } from './socket/socket.handler';
import { YouTubeSubscriptionRenewer } from './services/cron/YouTubeSubscriptionRenewer';
import { MessageBatcher } from './utils/MessageBatcher';
import { TwitchManager } from './services/chat';

// 1. Instanciar Socket.io (se vinculará al servidor HTTP luego)
const io = new Server({
    cors: {
        origin: config.frontendUrl,
        methods: ["GET", "POST"],
        credentials: true
    }
});

// 2. Inicializar el Contenedor de Dependencias
const container = createContainer(io);
const {
    chatManager,
    messageSenderService,
    connectionService,
    youtubeService,
    authController,
    webhookController
} = container;

// 3. Crear aplicación Express con los controladores inyectados
const app = createApp(authController, webhookController);

// 4. Crear servidor HTTP y vincular Express y Socket.io
const server = http.createServer(app);
io.attach(server);

// 5. Configurar Socket Handlers
setupSocketHandlers(io, chatManager, messageSenderService, connectionService, youtubeService);

// 6. Inicializar utilidades globales
MessageBatcher.getInstance().setIo(io);

// 7. Tareas de fondo y Cron Jobs
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

// Re-exportar para index.ts y otros módulos
export { app, io, chatManager, connectToDatabase };
export default server;