import express from 'express';

const server = express();

server.get('/api/status', (req, res) => {
    res.json({ status: 'ok', message: 'Streamlyra API is running' });
});

server.get('/', (req, res) => {
    res.send('Servidor funcionando');
});

export default server;