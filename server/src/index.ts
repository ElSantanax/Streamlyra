/** Punto de entrada principal del servidor */

import server, { connectToDatabase } from './server';
import { logger } from './utils/logger';
import { config } from './config';

async function startServer() {
    try {
        // 1. Esperar a la base de datos antes de nada
        await connectToDatabase();

        const PORT = config.port;

        // 2. Iniciar el servidor solo si la DB está lista
        server.listen(PORT, () => {
            logger.info(`El servidor está en el puerto ${PORT}`);
        });
    } catch (error) {
        logger.error({ err: error }, 'Error fatal durante el arranque del servidor');
        process.exit(1);
    }
}

startServer();