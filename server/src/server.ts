import express from 'express';
import colors from 'colors';
import db from './config/db';
import http from 'http';
import { Server } from 'socket.io';
import authRoutes from './routes/auth.routes';
import { setupSocketHandlers } from './socket/socket.handler';

async function connectToDatabase() {
    try {
        await db.authenticate();
        db.sync();
        console.log(colors.blue.bold('Conexión exitosa a la base de datos.'));
    } catch (error) {
        console.error(colors.red.bold('Hubo un error al conectar a la base de datos:'), error);
    }
}

connectToDatabase();

const app = express();
const server = http.createServer(app);

// Configurar Socket.io
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

// Middlewares
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

app.get('/api/status', (_req, res) => {
    res.json({ status: 'ok', message: 'Streamlyra API esta funcionando' });
});

app.get('/', (_req, res) => {
    res.send('Servidor funcionando');
});

// Setup Socket Handlers (Separation of Concerns)
setupSocketHandlers(io);

export { app, io };
export default server;