/** Gestor de conexión TMI.js de Twitch con manejo de reconexión */

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
            await client.disconnect();
            
            client.removeAllListeners();
            
            logger.debug({}, 'Twitch client disconnected successfully');
        } catch (error) {
            logger.error({ err: error }, 'Error disconnecting Twitch client');
        }
    }
}
