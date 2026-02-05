/** Gestor de chat con orquestación de proveedores por plataforma */

import { Server } from 'socket.io';
import { Platform } from '../../constants/platforms';
import { ConnectionService } from '../connection/ConnectionService';
import { ChatProvider } from '../chat';

import { SafeSocketEmitter } from '../../utils/SafeSocketEmitter';
import { withErrorHandling } from '../../utils/errorHandling';
import { logger } from '../../utils/logger';

export class ChatManager {
    private providers: Map<Platform, ChatProvider>;

    constructor(
        private io: Server,
        private connectionService: ConnectionService,

    ) {
        this.providers = new Map();
        // Mapear proveedores por nombre si tienen esa propiedad, 
        // o usar una lógica simple de detección de tipo (o simplemente pasarlos pre-mapeados).
        // Por ahora, asumimos que se pasan en un orden específico o usamos una interfaz mejorada.
        // Pero para KISS, los mapearemos manualmente en server.ts y los pasaremos.
    }

    // Método setter para inyectar proveedores post-construcción si es necesario, 
    // o simplemente inyectar el Map directamente.
    setProviders(providersMap: Map<Platform, ChatProvider>) {
        this.providers = providersMap;
    }

    private getProvider(platform: Platform): ChatProvider | undefined {
        return this.providers.get(platform);
    }

    async connectUser(userId: string): Promise<void> {
        await withErrorHandling(
            async () => {
                logger.info({ userId }, 'Connecting active chat providers');
                const connections = await this.connectionService.getAllConnections(userId);

                const promises = connections.map((conn: { provider: string }) =>
                    this.connectProvider(userId, conn.provider as Platform)
                );

                await Promise.allSettled(promises);
            },
            { userId, action: 'connectUser' },
            { rethrow: false }
        );
    }

    async disconnectUser(userId: string): Promise<void> {
        await withErrorHandling(
            async () => {
                logger.info({ userId }, 'Disconnecting all chat providers');
                const platforms = Array.from(this.providers.keys());
                const promises = platforms.map(platform =>
                    this.disconnectProvider(userId, platform)
                );
                await Promise.allSettled(promises);
            },
            { userId, action: 'disconnectUser' },
            { rethrow: false }
        );
    }

    async connectProvider(userId: string, platform: Platform): Promise<void> {
        await withErrorHandling(
            async () => {
                const provider = this.getProvider(platform);
                if (provider) {
                    await provider.connect(userId, this.io);
                }
            },
            { userId, platform, action: 'connectProvider' },
            { rethrow: false }
        );
    }

    async boostProviderDiscovery(userId: string, platform: Platform): Promise<void> {
        await withErrorHandling(
            async () => {
                const provider = this.getProvider(platform);
                if (provider && 'boostDiscovery' in provider) {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
                    await (provider as any).boostDiscovery(userId, this.io);
                }
            },
            { userId, platform, action: 'boostDiscovery' },
            { rethrow: false }
        );
    }

    async disconnectProvider(userId: string, platform: Platform): Promise<void> {
        await withErrorHandling(
            async () => {
                SafeSocketEmitter.emitViewersUpdate(this.io, userId, platform, 0, false);
                const provider = this.getProvider(platform);
                if (provider) {
                    await provider.disconnect(userId);
                }
            },
            { platform, userId, action: 'disconnectProvider' },
            { rethrow: false }
        );
    }
}