import express, { Request, Response } from 'express';
import db from './config/db';
import http from 'http';
import { Server } from 'socket.io';
import { createAuthRoutes } from './routes/auth.routes';
import webhookRoutes from './routes/webhook.routes';
import { setupSocketHandlers } from './socket/socket.handler';
import { ChatManager } from './services/ChatManager';
import { config } from './config';

async function connectToDatabase() {
    try {
        await db.authenticate();
        await db.sync();
        console.log('[INFO] Conexión exitosa a la base de datos.');
    } catch (error) {
        console.error('[ERROR] Hubo un error al conectar a la base de datos:', error);
    }
}

connectToDatabase();

const app = express();
const server = http.createServer(app);

interface RequestWithRawBody extends Request {
    rawBody?: string;
}

const io = new Server(server, {
    cors: {
        origin: config.frontendUrl,
        methods: ["GET", "POST"]
    }
});

const chatManager = new ChatManager(io);

app.use(express.json({
    verify: (req: RequestWithRawBody, _res: Response, buf: Buffer) => {
        req.rawBody = buf.toString();
    }
}));

app.use('/api/auth', createAuthRoutes(io, chatManager));
app.use('/api/webhooks', webhookRoutes);

app.get('/api/status', (_req, res) => {
    res.json({ status: 'ok', message: 'Streamlyra API esta funcionando' });
});

app.get('/', (_req, res) => {
    res.send('Servidor funcionando');
});

setupSocketHandlers(io, chatManager);

export { app, io, chatManager };
export default server;