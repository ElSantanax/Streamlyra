import { logger } from '../../../../utils/logger';
import { YouTubeModerationService } from '../../../../services/moderation/YouTubeModerationService';
import { YouTubeService } from '../../../../services/platforms/YouTubeService';
import { ModerationValidator } from '../validators/ModerationValidator';
import { IModerationStrategy, ModerationContext } from './IModerationStrategy';

/**
 * Estrategia de moderación para YouTube
 * Maneja eliminación de mensajes, bans y timeouts
 */
export class YouTubeModerationStrategy implements IModerationStrategy {
  constructor(
    private service: YouTubeModerationService,
    private youtubeService: YouTubeService,
    private validator: ModerationValidator
  ) { }

  async executeAction(context: ModerationContext): Promise<void> {
    const { socket, authenticatedUserId, action, messageId, targetUserId, duration } = context;

    // Validar conexión y obtener token
    const validated = await this.validator.validateAndGetToken(
      socket,
      authenticatedUserId,
      'youtube'
    );

    if (!validated) return;

    const { token, connection } = validated;

    // Manejar eliminación de mensaje
    if (action === 'delete' && messageId) {
      await this.service.deleteMessage({
        messageId,
        accessToken: token
      });

      socket.emit('moderation_success', {
        action: 'delete',
        platform: 'youtube',
        messageId,
        message: 'Mensaje eliminado'
      });

      logger.info(
        { userId: authenticatedUserId, messageId, platform: 'youtube' },
        'Message deleted successfully'
      );
      return;
    }

    // Manejar ban o timeout de usuario
    if ((action === 'ban' || action === 'timeout') && targetUserId) {
      // Obtener el liveChatId activo (usando caché optimizada)
      const liveChatId = await this.youtubeService.getActiveLiveChatId(token, connection.providerId);

      if (!liveChatId) {
        socket.emit('moderation_error', {
          code: 'NO_LIVE_CHAT',
          message: 'No hay un chat en vivo activo en YouTube'
        });
        return;
      }

      await this.service.banUser({
        liveChatId,
        channelId: targetUserId,
        accessToken: token,
        duration: action === 'timeout' ? (duration || 300) : undefined // YouTube usa segundos
      });

      socket.emit('moderation_success', {
        action,
        platform: 'youtube',
        targetUserId,
        message: action === 'ban' ? 'Usuario baneado' : 'Usuario en timeout'
      });

      // Emitir evento para eliminar mensajes del usuario baneado
      socket.emit('user_banned', {
        platform: 'youtube',
        targetUserId,
        action
      });

      logger.info(
        { userId: authenticatedUserId, targetUserId, action, platform: 'youtube' },
        'User moderation action completed'
      );
    }
  }
}
