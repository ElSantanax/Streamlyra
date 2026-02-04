/** Configuración del servidor Express y Socket.io con inyección de dependencias */

import express, { Request, Response } from 'express';
import db from './config/db';
import http from 'http';
import { Server } from 'socket.io';
import { createAuthRoutes } from './routes/auth.routes';
import { createWebhookRoutes } from './routes/webhook.routes';
import { setupSocketHandlers } from './socket/socket.handler';
import { ChatManager } from './services/ChatManager';
import { AuthService } from './services/auth/AuthService';
import { AuthController } from './controllers/auth.controller';
import { WebhookController } from './controllers/webhook.controller';
import { WebhookProcessor } from './services/webhook/WebhookProcessor';
import { config } from './config';
import { errorHandler } from './middleware/error.middleware';
import pinoHttp from 'pino-http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { logger } from './utils/logger';
import { UserRepository } from './repositories/implementations/UserRepository';
import { ConnectionRepository } from './repositories/implementations/ConnectionRepository';
import { ConnectionService } from './services/connection/ConnectionService';
import { setCsrfCookie, verifyCsrf } from './middleware/csrf.middleware';
import { MessageSenderService } from './services/message/MessageSenderService';
import { TwitchService, YouTubeService, KickService } from './services/platforms';
import { apiLimiter, webhookLimiter } from './middleware/rateLimit.middleware';
import { ActivityService } from './services/ActivityService';
import { AuthFlowProcessor } from './services/auth/AuthFlowProcessor';
import { UserProfileService } from './services/auth/core/UserProfileService';
import { AuthDTOBuilder } from './services/auth/AuthDTOBuilder';
import { PlatformAuthHandler } from './services/auth/core/PlatformAuthHandler';
import { UserService } from './services/user/UserService';


import { TwitchChatProvider, YouTubeChatProvider, KickChatProvider, TikTokChatProvider, ChatProvider } from './services/chat';
import { Platform } from './constants/platforms';

interface RequestWithRawBody extends Request {
    rawBody?: string;
}

export async function connectToDatabase() {
    try {
        await db.authenticate();
        await db.sync();
        logger.info('Conexión exitosa a la base de datos.');
    } catch (error) {
        logger.error({ err: error }, 'Hubo un error al conectar a la base de datos');
        process.exit(1); // Si la DB falla al arrancar, cerramos el proceso
    }
}

const userRepository = new UserRepository();
const connectionRepository = new ConnectionRepository();

const connectionService = new ConnectionService(connectionRepository);
const twitchService = new TwitchService();
const youtubeService = new YouTubeService();
const kickService = new KickService();
const messageSenderService = new MessageSenderService(
    connectionService,
    twitchService,
    youtubeService,
    kickService
);

const app = express();
app.set('trust proxy', 1); // Confía en el primer proxy (necesario para ngrok/rate-limit)
const server = http.createServer(app);

const io = new Server(server, {
    cors: { origin: config.frontendUrl, methods: ["GET", "POST"], credentials: true }
});

// Providers Instantiation
const twitchChatProvider = new TwitchChatProvider(connectionService);
const youtubeChatProvider = new YouTubeChatProvider(connectionService);
const kickChatProvider = new KickChatProvider(connectionService);
const tiktokChatProvider = new TikTokChatProvider();

const chatManager = new ChatManager(io, connectionService);
chatManager.setProviders(new Map<Platform, ChatProvider>([
    ['twitch', twitchChatProvider],
    ['youtube', youtubeChatProvider],
    ['kick', kickChatProvider],
    ['tiktok', tiktokChatProvider]
]));

// 1. Core Services with mutual dependencies
const activityService = new ActivityService(chatManager);
activityService.start();

// 2. Auth Re-architecture
const userServiceInst = new UserService(userRepository, connectionRepository);
const authDTOBuilder = new AuthDTOBuilder();
const platformAuthHandler = new PlatformAuthHandler(
    userServiceInst,
    connectionService,
    connectionRepository,
    authDTOBuilder
);
const authFlowProcessor = new AuthFlowProcessor(
    platformAuthHandler,
    chatManager,
    connectionService,
    activityService
);
const userProfileService = new UserProfileService(
    userServiceInst,
    authDTOBuilder
);

const authService = new AuthService(authFlowProcessor, userProfileService);
const webhookProcessor = new WebhookProcessor(io);

const authController = new AuthController(authService);
const webhookController = new WebhookController(webhookProcessor);

app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
}));

app.use(cookieParser());

app.use(setCsrfCookie);
app.use(verifyCsrf);

app.use(pinoHttp({
    logger,
    serializers: {
        req(req) {
            const r = req as unknown as { id?: string; method?: string; url?: string };
            return {
                id: r.id,
                method: r.method,
                url: r.url
            };
        },
        res(res) {
            const r = res as unknown as { statusCode?: number };
            return {
                statusCode: r.statusCode
            };
        }
    }
}));

app.use(express.json({
    verify: (req: RequestWithRawBody, _res: Response, buf: Buffer) => {
        req.rawBody = buf.toString();
    }
}));

// Aplicar Rate Limiting GLOBAL para endpoints que empiecen con /api/
app.use('/api/', apiLimiter);

// Aplicar Rate Limiting ESTRICTO para autenticación (sobrescribe o suma al global si se anidan, 
// pero aqui se aplica justo antes del router de auth)
app.use('/api/auth', createAuthRoutes(authController));

// Aplicar Rate Limiting ESPECÍFICO para webhooks (alto tráfico permitido)
app.use('/api/webhooks', webhookLimiter, createWebhookRoutes(webhookController));

app.get('/api/status', (_req, res) => {
    res.json({ status: 'ok', message: 'API Online' });
});

app.get('/', (_req, res) => {
    res.send('Servidor funcionando');
});

app.use(errorHandler);

setupSocketHandlers(io, chatManager, messageSenderService, activityService, connectionService, youtubeService);

export { app, io, chatManager };
export default server;