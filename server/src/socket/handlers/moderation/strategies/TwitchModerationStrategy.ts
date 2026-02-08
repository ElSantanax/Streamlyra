import { logger } from '../../../../utils/logger';
import { TwitchModerationService } from '../../../../services/moderation/TwitchModerationService';
import { ModerationValidator } from '../validators/ModerationValidator';
import { IModerationStrategy, ModerationContext } from './IModerationStrategy';

/**
 * Estrategia de moderación para Twitch
 * Maneja eliminación de mensajes, bans y timeouts
 */
export class TwitchModerationStrategy implements IModerationStrategy {
  constructor(
    private service: TwitchModerationService,
    private validator: ModerationValidator
  ) {}

  async executeAction(context: ModerationContext): Promise<void> {
    const { socket, authenticatedUserId, action, messageId, targetUserId, reason, duration } = context;

    // Validar conexión y obtener token
    const validated = await this.validator.validateAndGetToken(
      socket,
      authenticatedUserId,
      'twitch'
    );

    if (!validated) return;

    const { connection, token } = validated;
    const broadcasterId = connection.providerId;
    const moderatorId = connection.providerId;

    // Manejar eliminación de mensaje
    if (action === 'delete' && messageId) {
      await this.service.deleteMessage({
        broadcasterId,
        moderatorId,
        messageId,
        accessToken: token
      });

      socket.emit('moderation_success', {
        action: 'delete',
        platform: 'twitch',
        messageId,
        message: 'Mensaje eliminado'
      });

      logger.info(
        { userId: authenticatedUserId, messageId, platform: 'twitch' },
        'Message deleted successfully'
      );
      return;
    }

    // Manejar ban o timeout de usuario
    if ((action === 'ban' || action === 'timeout') && targetUserId) {
      await this.service.banUser({
        broadcasterId,
        moderatorId,
        userId: targetUserId,
        accessToken: token,
        reason,
        duration: action === 'timeout' ? (duration || 600) : undefined
      });

      socket.emit('moderation_success', {
        action,
        platform: 'twitch',
        targetUserId,
        message: action === 'ban' ? 'Usuario baneado' : 'Usuario en timeout'
      });

      // Emitir evento para eliminar mensajes del usuario baneado
      socket.emit('user_banned', {
        platform: 'twitch',
        targetUserId,
        action
      });

      logger.info(
        { userId: authenticatedUserId, targetUserId, action, platform: 'twitch' },
        'User moderation action completed'
      );
    }
  }
}
