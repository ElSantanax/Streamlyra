/**
 * Gestor de Conexión de Twitch
 * Responsabilidad: Gestionar conexión TMI.js a Twitch
 */

import tmi from 'tmi.js';
import { Connection } from '../../../models/Connection.model';
import { User } from '../../../models/User.model';
import { ConnectionService } from '../../connection/ConnectionService';
import { logger } from '../../../utils/logger';

export class TwitchConnectionManager {
    constructor(private connectionService: ConnectionService) {}

    async connect(userId: string): Promise<tmi.Client> {
        const connection = await Connection.findOne({
            where: { userId: String(userId), provider: 'twitch' },
            include: [User]
        });

        if (!connection || !connection.user) {
            throw new Error('No Twitch connection found');
        }

        const validToken = await this.connectionService.getValidAccessToken(userId, 'twitch');
        const username = connection.providerUsername || connection.user.username;
        const accessToken = validToken || connection.accessToken;

        const client = new tmi.Client({
            options: { debug: false },
            connection: { reconnect: true, secure: true },
            identity: { username: username, password: `oauth:${accessToken}` },
            channels: [username]
        });

        await client.connect();
        logger.info({ username, userId }, 'Connected to Twitch chat');

        return client;
    }

    async disconnect(client: tmi.Client): Promise<void> {
        try {
            // Deshabilitar reconexión automática antes de desconectar
            // TMI.js no expone opts directamente, pero disconnect() ya maneja esto
            // Al llamar disconnect(), TMI.js internamente marca la desconexión como intencional
            // y no intenta reconectar automáticamente
            await client.disconnect();
            
            // Remover todos los listeners para asegurar limpieza completa
            client.removeAllListeners();
            
            logger.debug({}, 'Twitch client disconnected successfully');
        } catch (error) {
            logger.error({ err: error }, 'Error disconnecting Twitch client');
        }
    }
}
