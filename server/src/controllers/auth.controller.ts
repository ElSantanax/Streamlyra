import { Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.model';
import { Connection } from '../models/Connection.model';

export const twitchAuth = async (req: Request, res: Response): Promise<void> => {
    const { code } = req.body;

    if (!code) {
        res.status(400).json({ error: 'Falta el código de autorización' });
        return;
    }

    try {
        // 1. Intercambiar el código por un access_token de Twitch
        const tokenResponse = await axios.post('https://id.twitch.tv/oauth2/token', null, {
            params: {
                client_id: process.env.TWITCH_CLIENT_ID,
                client_secret: process.env.TWITCH_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
                redirect_uri: process.env.TWITCH_REDIRECT_URI // Debe coincidir EXACTAMENTE con el de la consola de Twitch
            }
        });

        const { access_token, refresh_token, expires_in } = tokenResponse.data;

        // 2. Obtener los datos del usuario de Twitch usando el token
        const userResponse = await axios.get('https://api.twitch.tv/helix/users', {
            headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': `Bearer ${access_token}`
            }
        });

        const twitchUser = userResponse.data.data[0];

        // 3. Buscar si YA existe una conexión con este ID de Twitch
        let connection = await Connection.findOne({
            where: { provider: 'twitch', providerId: twitchUser.id },
            include: [User]
        });

        let user;

        if (connection) {
            // == USUARIO EXISTENTE ==
            console.log('Usuario existente encontrado:', twitchUser.display_name);
            user = connection.user;

            // Actualizamos los tokens por si han cambiado
            connection.accessToken = access_token;
            connection.refreshToken = refresh_token;
            // calcular fecha de expiración (expires_in son segundos)
            const expiryDate = new Date();
            expiryDate.setSeconds(expiryDate.getSeconds() + expires_in);
            connection.expiryDate = expiryDate;

            await connection.save();

            // Opcional: Actualizar datos del perfil si cambiaron en Twitch
            if (user.avatarUrl !== twitchUser.profile_image_url || user.displayName !== twitchUser.display_name) {
                user.avatarUrl = twitchUser.profile_image_url;
                user.displayName = twitchUser.display_name;
                await user.save();
            }

        } else {
            // == USUARIO NUEVO ==
            console.log('Creando nuevo usuario para:', twitchUser.display_name);

            // Transacción: Crear Usuario Y Conexión, o ninguno.
            // Nota: Sequelize maneja transacciones, pero por simplicidad primero creamos User y luego Connection

            // Primero verificamos si existe un usuario con ese username (raro pero posible si permitimos registro por email luego)
            user = await User.create({
                username: twitchUser.login, // login es el username único en minúsculas
                displayName: twitchUser.display_name,
                avatarUrl: twitchUser.profile_image_url,
                email: twitchUser.email // Solo viene si pedimos scope 'user:read:email'
            });

            // Creamos la conexión
            const expiryDate = new Date();
            expiryDate.setSeconds(expiryDate.getSeconds() + expires_in);

            connection = await Connection.create({
                provider: 'twitch',
                providerId: twitchUser.id,
                accessToken: access_token,
                refreshToken: refresh_token,
                expiryDate: expiryDate,
                userId: user.id
            });
        }

        // 4. Generar Token JWT para NUESTRO frontend
        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'secret_super_seguro_dev', // TODO: Poner en .env
            { expiresIn: '7d' }
        );

        // 5. Responder al frontend con el token y datos usuario
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatarUrl
            }
        });

    } catch (error: any) {
        console.error('Error en autenticación Twitch:', error.response?.data || error.message);
        res.status(500).json({ error: 'Error al autenticar con Twitch' });
    }
};

export const devLogin = async (req: Request, res: Response): Promise<void> => {
    try {
        // Buscar o crear usuario de prueba
        const [user] = await User.findOrCreate({
            where: { username: 'devuser' },
            defaults: {
                username: 'devuser',
                displayName: 'Desarrollador (Test)',
                avatarUrl: 'https://ui-avatars.com/api/?name=Dev+User&background=random',
                email: 'dev@test.com'
            }
        });

        // Asegurarnos de que tenga una conexión "falsa" de Twitch para pruebas
        await Connection.findOrCreate({
            where: {
                provider: 'twitch',
                userId: user.id
            },
            defaults: {
                provider: 'twitch',
                providerId: '123456789', // ID falso de Twitch
                accessToken: 'mock_access_token',
                refreshToken: 'mock_refresh_token',
                userId: user.id
            }
        });

        const token = jwt.sign(
            { id: user.id, username: user.username },
            process.env.JWT_SECRET || 'secret_super_seguro_dev',
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                displayName: user.displayName,
                avatar: user.avatarUrl
            }
        });

    } catch (error) {
        console.error('Error en Dev Login:', error);
        res.status(500).json({ error: 'Error al crear usuario de prueba' });
    }
};
