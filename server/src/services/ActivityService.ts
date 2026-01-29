/** 
 * Servicio de actividad - Gestiona la inactividad de los usuarios para ahorrar recursos 
 */
import { logger } from '../utils/logger';
import { ChatManager } from './ChatManager';

export class ActivityService {
    private lastActivity: Map<string, number> = new Map();
    private pausedUsers: Set<string> = new Set();
    private checkInterval: NodeJS.Timeout | null = null;

    // Configuración: 5 minutos de inactividad para pausar
    private readonly INACTIVITY_THRESHOLD = 5 * 60 * 1000;
    // Comprobar cada minuto
    private readonly CHECK_INTERVAL = 60 * 1000;

    constructor(private chatManager: ChatManager) { }

    /** Inicia el monitor de inactividad */
    start() {
        if (this.checkInterval) return;

        logger.info({}, 'ActivityService: Iniciando monitor de inactividad');
        this.checkInterval = setInterval(() => this.checkInactivity(), this.CHECK_INTERVAL);
    }

    /** Registra actividad de un usuario */
    recordActivity(userId: string) {
        this.lastActivity.set(userId, Date.now());

        // Si estaba pausado, reanudar
        if (this.pausedUsers.has(userId)) {
            this.resumeUser(userId);
        }
    }

    /** Comprueba quién lleva demasiado tiempo inactivo */
    private async checkInactivity() {
        const now = Date.now();

        for (const [userId, lastTime] of this.lastActivity.entries()) {
            if (now - lastTime > this.INACTIVITY_THRESHOLD && !this.pausedUsers.has(userId)) {
                await this.pauseUser(userId);
            }
        }
    }

    private async pauseUser(userId: string) {
        logger.info({ userId }, 'ActivityService: Usuario inactivo detectado. Pausando servicios para ahorrar recursos.');
        this.pausedUsers.add(userId);

        try {
            // Desconectamos proveedores pero NO borramos la sesión
            await this.chatManager.disconnectUser(userId);
            logger.info({ userId }, 'ActivityService: Servicios pausados exitosamente.');
        } catch (error) {
            logger.error({ err: error, userId }, 'ActivityService: Error al pausar servicios');
        }
    }

    private async resumeUser(userId: string) {
        logger.info({ userId }, 'ActivityService: Usuario activo de nuevo. Reanudando servicios.');
        this.pausedUsers.delete(userId);

        try {
            await this.chatManager.connectUser(userId);
            logger.info({ userId }, 'ActivityService: Servicios reanudados exitosamente.');
        } catch (error) {
            logger.error({ err: error, userId }, 'ActivityService: Error al reanudar servicios');
        }
    }

    /** Limpia datos de un usuario que se desconectó totalmente */
    cleanupUser(userId: string) {
        this.lastActivity.delete(userId);
        this.pausedUsers.delete(userId);
    }
}
