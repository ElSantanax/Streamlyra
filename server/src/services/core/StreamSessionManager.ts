import { logger } from '../../utils/logger';

interface UserSession {
    livePlatforms: Set<string>;
    startTime: string | null;
}

export class StreamSessionManager {
    private static instance: StreamSessionManager;
    private sessions: Map<string, UserSession> = new Map();

    private constructor() { }

    static getInstance(): StreamSessionManager {
        if (!StreamSessionManager.instance) {
            StreamSessionManager.instance = new StreamSessionManager();
        }
        return StreamSessionManager.instance;
    }

    private getOrCreateSession(userId: string): UserSession {
        let session = this.sessions.get(userId);
        if (!session) {
            session = {
                livePlatforms: new Set(),
                startTime: null
            };
            this.sessions.set(userId, session);
        }
        return session;
    }

    /**
     * Actualiza el estado de vivo de una plataforma para un usuario
     * @returns True si el estado global de la sesión cambió (empezó o terminó)
     */
    updateLiveStatus(userId: string, platform: string, isLive: boolean): { isSessionActive: boolean; startTime: string | null } {
        const session = this.getOrCreateSession(userId);

        if (isLive) {
            session.livePlatforms.add(platform);
            if (!session.startTime) {
                session.startTime = new Date().toISOString();
                logger.info({ userId, platform, startTime: session.startTime }, 'Stream session started');
            }
        } else {
            session.livePlatforms.delete(platform);
            if (session.livePlatforms.size === 0) {
                logger.info({ userId, platform }, 'Stream session ended (all platforms offline)');
                session.startTime = null;
            }
        }

        return {
            isSessionActive: session.livePlatforms.size > 0,
            startTime: session.startTime
        };
    }

    getSession(userId: string): { isSessionActive: boolean; startTime: string | null } {
        const session = this.sessions.get(userId);
        return {
            isSessionActive: (session?.livePlatforms.size || 0) > 0,
            startTime: session?.startTime || null
        };
    }

    isPlatformLive(userId: string, platform: string): boolean {
        return this.sessions.get(userId)?.livePlatforms.has(platform) || false;
    }
}
