import dotenv from 'dotenv';
dotenv.config();
import colors from 'colors';
import server from './server';

server.listen(4000, () => {
    console.log(colors.cyan.bold('El servidor esta en el puerto 4000'));
});