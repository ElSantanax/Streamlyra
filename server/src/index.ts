/** Punto de entrada principal del servidor */

import server, { connectToDatabase, gracefulShutdown } from './server';
import { logger } from './utils/logger';
import { config } from './config';
import { emitConfigWarnings } from './config/validation';

emitConfigWarnings(logger);

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

async function startServer() {
    try {
        await connectToDatabase();

        const PORT = config.port;

        server.listen(PORT, () => {
            logger.info(`El servidor está en el puerto ${PORT}`);
        });
    } catch (error) {
        logger.error({ err: error }, 'Error fatal durante el arranque del servidor');
        process.exit(1);
    }
}

startServer();