import express from 'express';
import colors from 'colors';
import db from './config/db';

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

import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);

// Configurar Socket.io con CORS permitido para el frontend
const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173", // URL de tu frontend
        methods: ["GET", "POST"]
    }
});

import authRoutes from './routes/auth.routes';

app.use(express.json());

app.use('/api/auth', authRoutes);

app.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'Streamlyra API esta funcionando' });
});

app.get('/', (req, res) => {
    res.send('Servidor funcionando');
});

import { ChatManager } from './services/ChatManager';

// ... (después de configurar io)

const chatManager = new ChatManager(io);

// Evento de conexión de usuarios al socket
io.on('connection', (socket) => {
    console.log(colors.magenta('Nuevo cliente conectado al socket: ' + socket.id));

    // El cliente debe enviarnos quién es (su ID de usuario) al conectarse
    socket.on('identify', async (userId: string) => {
        console.log(colors.cyan(`🆔 IDENTIFY recibido - UserId: ${userId} | SocketId: ${socket.id}`));
        socket.join(userId);
        console.log(colors.green(`✅ Socket unido a sala: ${userId}`));

        // Iniciamos la escucha de Twitch
        await chatManager.connectUser(userId, socket.id);
    });

    socket.on('disconnect', () => {
        console.log('Cliente desconectado');
        // Aquí podríamos desconectar TMI, o dejarlo vivo un rato por si reconecta rápido
        // Por simplicidad, no desconectamos TMI inmediatamente para mantener persistencia si recarga
    });
});

export { app, io };
export default server;