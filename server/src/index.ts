import dotenv from 'dotenv';
dotenv.config();
import server from './server';

server.listen(4000, () => {
    console.log('[INFO] El servidor está en el puerto 4000');
});