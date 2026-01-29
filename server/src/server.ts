/** Configuración del servidor Express y Socket.io con inyección de dependencias */

import express, { Request, Response } from 'express';
import db from './config/db';
import http from 'http';
import { Server } from 'socket.io';
import { createAuthRoutes } from './routes/auth.routes';
import { createWebhookRoutes } from './routes/webhook.routes';
import { setupSocketHandlers } from './socket/socket.handler';
import { ChatManager } from './services/ChatManager';
import { AuthService } from './services/AuthService';
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

async function connectToDatabase() {
    try {
        await db.authenticate();
        await db.sync();
        logger.info('Conexión exitosa a la base de datos.');
    } catch (error) {
        logger.error({ err: error }, 'Hubo un error al conectar a la base de datos');
    }
}

connectToDatabase();

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
const server = http.createServer(app);

interface RequestWithRawBody extends Request {
    rawBody?: string;
}

const io = new Server(server, {
    cors: {
        origin: config.frontendUrl,
        methods: ["GET", "POST"],
        credentials: true
    }
});

const chatManager = new ChatManager(io, connectionService);
const authService = new AuthService(userRepository, connectionRepository, chatManager);
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

app.use('/api/auth', createAuthRoutes(authController));

app.use('/api/webhooks', createWebhookRoutes(webhookController));

app.get('/api/status', (_req, res) => {
    res.json({ status: 'ok', message: 'Streamlyra API esta funcionando' });
});

app.get('/', (_req, res) => {
    res.send('Servidor funcionando');
});

app.use(errorHandler);

setupSocketHandlers(io, chatManager, messageSenderService);

export { app, io, chatManager };
export default server;