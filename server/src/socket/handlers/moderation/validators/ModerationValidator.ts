import { Socket } from 'socket.io';
import { Connection } from '../../../../models/Connection.model';
import { ConnectionService } from '../../../../services/connection/ConnectionService';
import { Platform } from '../../../../constants/platforms';

export class ModerationValidator {
  constructor(private connectionService: ConnectionService) { }

  async validateAndGetToken(
    socket: Socket,
    authenticatedUserId: string,
    platform: Platform
  ): Promise<{ connection: Connection; token: string } | null> {
    const connection = await Connection.findOne({
      where: { userId: authenticatedUserId, provider: platform }
    });

    if (!connection) {
      socket.emit('moderation_error', {
        code: 'NO_CONNECTION',
        message: `No tienes una conexión de ${platform} activa`
      });
      return null;
    }

    const validToken = await this.connectionService.getValidAccessToken(
      authenticatedUserId,
      platform
    );

    if (!validToken) {
      socket.emit('moderation_error', {
        code: 'INVALID_TOKEN',
        message: `Token de ${platform} inválido o expirado`
      });
      return null;
    }

    return { connection, token: validToken };
  }
}