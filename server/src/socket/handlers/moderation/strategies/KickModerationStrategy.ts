import { logger } from '../../../../utils/logger';
import { KickModerationService } from '../../../../services/moderation/KickModerationService';
import { ModerationValidator } from '../validators/ModerationValidator';
import { IModerationStrategy, ModerationContext } from './IModerationStrategy';

/**
 * Estrategia de moderación para Kick
 * Maneja eliminación de mensajes, bans y timeouts
 */
export class KickModerationStrategy implements IModerationStrategy {
  constructor(
    private service: KickModerationService,
    private validator: ModerationValidator
  ) {}

  async executeAction(context: ModerationContext): Promise<void> {
    const { socket, authenticatedUserId, action, messageId, targetUserId, reason, duration } = context;

    // Validar conexión y obtener token
    const validated = await this.validator.validateAndGetToken(
      socket,
      authenticatedUserId,
      'kick'
    );

    if (!validated) return;

    const { connection, token } = validated;
    const broadcasterUserId = connection.providerId;

    // Manejar eliminación de mensaje
    if (action === 'delete' && messageId) {
      await this.service.deleteMessage({
        messageId,
        accessToken: token
      });

      socket.emit('moderation_success', {
        action: 'delete',
        platform: 'kick',
        messageId,
        message: 'Mensaje eliminado'
      });

      logger.info(
        { userId: authenticatedUserId, messageId, platform: 'kick' },
        'Message deleted successfully'
      );
      return;
    }

    // Manejar ban o timeout de usuario
    if ((action === 'ban' || action === 'timeout') && targetUserId) {
      await this.service.banUser({
        broadcasterUserId,
        userId: targetUserId,
        accessToken: token,
        duration: action === 'timeout' ? (duration || 10) : undefined, // Kick usa minutos
        reason
      });

      socket.emit('moderation_success', {
        action,
        platform: 'kick',
        targetUserId,
        message: action === 'ban' ? 'Usuario baneado' : 'Usuario en timeout'
      });

      // Emitir evento para eliminar mensajes del usuario baneado
      socket.emit('user_banned', {
        platform: 'kick',
        targetUserId,
        action
      });

      logger.info(
        { userId: authenticatedUserId, targetUserId, action, platform: 'kick' },
        'User moderation action completed'
      );
    }
  }
}
