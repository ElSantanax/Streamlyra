/**
 * Servidor Principal
 * Responsabilidad: Configurar Express, Socket.io, y centralizar inyección de dependencias
 * 
 * Arquitectura:
 * 1. Inicializar repositorios (acceso a datos)
 * 2. Inicializar servicios (lógica de negocio)
 * 3. Inicializar controladores (manejo HTTP)
 * 4. Configurar middlewares
 * 5. Configurar rutas
 * 6. Configurar Socket.io
 */

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

/**
 * Conecta a la base de datos
 */
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

// ============================================================================
// INYECCIÓN DE DEPENDENCIAS - Inicializar en orden de dependencias
// ============================================================================

// 1. Repositorios (acceso a datos)
const userRepository = new UserRepository();
const connectionRepository = new ConnectionRepository();

// 2. Servicios (lógica de negocio)
const connectionService = new ConnectionService(connectionRepository);

// 3. Express y Socket.io
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

// 4. Servicios que dependen de Socket.io
const chatManager = new ChatManager(io, connectionService);
const authService = new AuthService(userRepository, connectionRepository, chatManager);
const webhookProcessor = new WebhookProcessor(io);

// 5. Controladores (dependen de servicios)
const authController = new AuthController(authService);
const webhookController = new WebhookController(webhookProcessor);

// ============================================================================
// CONFIGURACIÓN DE MIDDLEWARES
// ============================================================================

app.use(cors({
    origin: config.frontendUrl,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(cookieParser());

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

// ============================================================================
// CONFIGURACIÓN DE RUTAS
// ============================================================================

// Rutas de autenticación (inyectando controlador)
app.use('/api/auth', createAuthRoutes(authController));

// Rutas de webhooks (inyectando controlador)
app.use('/api/webhooks', createWebhookRoutes(webhookController));

// Rutas de estado
app.get('/api/status', (_req, res) => {
    res.json({ status: 'ok', message: 'Streamlyra API esta funcionando' });
});

app.get('/', (_req, res) => {
    res.send('Servidor funcionando');
});

// Middleware de manejo de errores (debe ser el último)
app.use(errorHandler);

// ============================================================================
// CONFIGURACIÓN DE SOCKET.IO
// ============================================================================

setupSocketHandlers(io, chatManager);

export { app, io, chatManager };
export default server;