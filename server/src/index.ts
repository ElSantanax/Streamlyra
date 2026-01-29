/** Punto de entrada principal del servidor */

import dotenv from 'dotenv';
dotenv.config();
import server from './server';
import { logger } from './utils/logger';

server.listen(4000, () => {
    logger.info('El servidor está en el puerto 4000');
});