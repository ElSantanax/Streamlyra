import { io } from 'socket.io-client';

// Conectamos directamente al backend (puerto 4000)
// autoConnect: false para tener control de cuándo nos conectamos (ej: después de login)
export const socket = io('http://localhost:4000', {
    autoConnect: false,
    transports: ['websocket'] // Forzamos websocket para mejor rendimiento
});
