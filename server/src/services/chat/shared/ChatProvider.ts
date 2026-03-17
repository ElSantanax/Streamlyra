/** Interfaz base para proveedores de chat de plataformas */

import { Server } from 'socket.io';
import { GlobalConnectionStatus } from '../../../types';

export interface ChatProvider {
    connect(userId: string, io: Server): Promise<void>;
    disconnect(userId: string): Promise<void>;
    boostDiscovery?(userId: string, io: Server, forceRefresh?: boolean): Promise<void>;
    getStatus?(userId: string): { status: GlobalConnectionStatus; message?: string; isLive: boolean } | null;
    /** Limpia datos permanentes al eliminar la cuenta (webhook subscriptions, cache, etc) */
    onAccountDeleted?(userId: string): Promise<void>;
}
