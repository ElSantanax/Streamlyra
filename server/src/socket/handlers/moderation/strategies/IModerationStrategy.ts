import { Socket } from 'socket.io';

/**
 * Contexto compartido para todas las acciones de moderación
 */
export interface ModerationContext {
  socket: Socket;
  authenticatedUserId: string;
  action: string;
  messageId?: string;
  targetUserId?: string;
  reason?: string;
  duration?: number;
  platformIds?: Record<string, string>;
}

/**
 * Interfaz para estrategias de moderación por plataforma
 */
export interface IModerationStrategy {
  executeAction(context: ModerationContext): Promise<void>;
}
