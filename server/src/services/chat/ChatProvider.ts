import { Server } from 'socket.io';

export interface ChatProvider {
    connect(userId: string, io: Server): Promise<void>;
    disconnect(userId: string): Promise<void>;
}
