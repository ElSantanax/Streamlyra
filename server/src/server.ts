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

const server = express();

server.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'Streamlyra API esta funcionando' });
});

server.get('/', (req, res) => {
    res.send('Servidor funcionando');
});

export default server;