import { logger } from '../../../../utils/logger';
import { TwitchModerationService } from '../../../../services/moderation/TwitchModerationService';
import { KickModerationService } from '../../../../services/moderation/KickModerationService';
import { YouTubeModerationService } from '../../../../services/moderation/YouTubeModerationService';
import { ConnectionService } from '../../../../services/connection/ConnectionService';
import { Connection } from '../../../../models/Connection.model';
import { Platform } from '../../../../constants/platforms';
import { IModerationStrategy, ModerationContext } from './IModerationStrategy';

/**
 * Estrategia de moderación para el Dashboard
 * Maneja eliminación de mensajes que pueden estar sincronizados con múltiples plataformas
 */
export class DashboardModerationStrategy implements IModerationStrategy {
  constructor(
    private twitchService: TwitchModerationService,
    private kickService: KickModerationService,
    private youtubeService: YouTubeModerationService,
    private connectionService: ConnectionService
  ) {}

  async executeAction(context: ModerationContext): Promise<void> {
    const { socket, authenticatedUserId, action, messageId, platformIds } = context;

    // Solo soportamos eliminación en el dashboard
    if (action !== 'delete') {
      socket.emit('moderation_error', {
        code: 'UNSUPPORTED_ACTION',
        message: 'Solo se permite eliminar mensajes del dashboard'
      });
      return;
    }

    // Si no hay platformIds, el mensaje solo se elimina del dashboard (ya ocurrió optimisticamente)
    if (!platformIds || Object.keys(platformIds).length === 0) {
      socket.emit('moderation_success', {
        action: 'delete',
        platform: 'dashboard',
        messageId,
        message: 'Mensaje eliminado localmente'
      });
      return;
    }

    logger.info(
      { userId: authenticatedUserId, messageId, platformIds },
      'Processing dashboard message deletion'
    );

    // Intentar eliminar de cada plataforma
    const deletionPromises = Object.entries(platformIds).map(([platform, pid]) =>
      this.deletePlatformMessage(authenticatedUserId, platform as Platform, pid)
    );

    const results = await Promise.all(deletionPromises);
    const allSuccessful = results.every(r => r.success);

    // Emitir resultado apropiado
    if (allSuccessful) {
      socket.emit('moderation_success', {
        action: 'delete',
        platform: 'dashboard',
        messageId,
        message: 'Mensaje eliminado de todas las plataformas'
      });
    } else {
      const failed = results.filter(r => !r.success).map(r => r.platform).join(', ');
      socket.emit('moderation_warning', {
        action: 'delete',
        platform: 'dashboard',
        messageId,
        message: `Mensaje eliminado del dashboard, pero falló en: ${failed}`
      });
    }
  }

  /**
   * Intenta eliminar un mensaje de una plataforma específica
   */
  private async deletePlatformMessage(
    userId: string,
    platform: Platform,
    messageId: string
  ): Promise<{ platform: string; success: boolean; error?: string }> {
    try {
      const validToken = await this.connectionService.getValidAccessToken(userId, platform);

      if (!validToken) {
        return { platform, success: false, error: 'Token inválido' };
      }

      if (platform === 'twitch') {
        await this.deleteTwitchMessage(userId, messageId, validToken);
      } else if (platform === 'kick') {
        await this.kickService.deleteMessage({ messageId, accessToken: validToken });
      } else if (platform === 'youtube') {
        await this.youtubeService.deleteMessage({ messageId, accessToken: validToken });
      }

      return { platform, success: true };
    } catch (error) {
      logger.error(
        { err: error, platform, messageId },
        'Failed to delete dashboard message from platform'
      );
      return {
        platform,
        success: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      };
    }
  }

  /**
   * Elimina un mensaje de Twitch (requiere broadcasterId y moderatorId)
   */
  private async deleteTwitchMessage(
    userId: string,
    messageId: string,
    accessToken: string
  ): Promise<void> {
    const connection = await Connection.findOne({
      where: { userId, provider: 'twitch' }
    });

    if (!connection) {
      throw new Error('No conectado a Twitch');
    }

    await this.twitchService.deleteMessage({
      broadcasterId: connection.providerId,
      moderatorId: connection.providerId,
      messageId,
      accessToken
    });
  }
}
