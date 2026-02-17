import db from './db';
import { logger } from '../utils/logger';

/**
 * Establece la conexión con la base de datos con reintentos.
 */
export async function connectToDatabase(retries = 5, interval = 5000) {
    while (retries > 0) {
        try {
            await db.authenticate();
            await db.sync();
            logger.info('Conexión exitosa a la base de datos.');
            return;
        } catch (error) {
            retries--;
            logger.error(
                { err: error, remainingRetries: retries },
                `Error al conectar a la base de datos. Reintentando en ${interval / 1000}s...`
            );

            if (retries === 0) {
                logger.fatal('No se pudo establecer conexión con la base de datos tras varios intentos. Saliendo...');
                process.exit(1);
            }

            await new Promise(resolve => setTimeout(resolve, interval));
        }
    }
}
