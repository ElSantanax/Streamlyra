import { Socket } from 'socket.io';
import { logger } from '../../utils/logger';
import { TwitchModerationService } from '../../services/moderation/TwitchModerationService';
import { KickModerationService } from '../../services/moderation/KickModerationService';
import { YouTubeModerationService } from '../../services/moderation/YouTubeModerationService';
import { ConnectionService } from '../../services/connection/ConnectionService';
import { YouTubeService } from '../../services/platforms/YouTubeService';
import { isValidModerationPayload } from '../validators/SocketValidators';
import type { ModerationActionRequest } from '../../types/message.types';
import { SocketErrorHandler } from '../utils/SocketErrorHandler';
import { IModerationStrategy } from './moderation/strategies/IModerationStrategy';
import { TwitchModerationStrategy } from './moderation/strategies/TwitchModerationStrategy';
import { KickModerationStrategy } from './moderation/strategies/KickModerationStrategy';
import { YouTubeModerationStrategy } from './moderation/strategies/YouTubeModerationStrategy';
import { DashboardModerationStrategy } from './moderation/strategies/DashboardModerationStrategy';
import { ModerationValidator } from './moderation/validators/ModerationValidator';

const SUPPORTED_PLATFORMS = ['twitch', 'kick', 'youtube', 'dashboard'] as const;

export class ModerationSocketHandler {
    private strategies: Map<string, IModerationStrategy>;
    private validator: ModerationValidator;

    constructor(
        twitchModerationService: TwitchModerationService,
        kickModerationService: KickModerationService,
        youtubeModerationService: YouTubeModerationService,
        connectionService: ConnectionService,
        youtubeService: YouTubeService
    ) {
        this.validator = new ModerationValidator(connectionService);

        // Inicializar estrategias por plataforma
        this.strategies = new Map<string, IModerationStrategy>([
            ['twitch', new TwitchModerationStrategy(twitchModerationService, this.validator)],
            ['kick', new KickModerationStrategy(kickModerationService, this.validator)],
            ['youtube', new YouTubeModerationStrategy(youtubeModerationService, youtubeService, this.validator)],
            ['dashboard', new DashboardModerationStrategy(
                twitchModerationService,
                kickModerationService,
                youtubeModerationService,
                connectionService
            )]
        ]);
    }

    setupHandler(socket: Socket, authenticatedUserId: string) {
        socket.on('moderation_action', async (payload: unknown) => {
            logger.info({ socketId: socket.id }, 'Received moderation_action event');

            try {
                // Validar payload
                if (!isValidModerationPayload(payload)) {
                    SocketErrorHandler.emitModerationError(
                        socket,
                        'INVALID_PAYLOAD',
                        'Datos de moderación inválidos',
                        { payload }
                    );
                    return;
                }

                const request = payload as ModerationActionRequest;

                // Validar autenticación
                if (authenticatedUserId !== request.userId) {
                    SocketErrorHandler.emitModerationAuthError(socket, request.userId, authenticatedUserId);
                    return;
                }

                // Validar plataforma soportada
                if (!this.isSupportedPlatform(request.platform)) {
                    socket.emit('moderation_error', {
                        code: 'UNSUPPORTED_PLATFORM',
                        message: 'Moderación solo disponible para Twitch, Kick y YouTube'
                    });
                    return;
                }

                // Obtener y ejecutar estrategia correspondiente
                const strategy = this.strategies.get(request.platform);
                if (!strategy) {
                    throw new Error(`No strategy found for platform: ${request.platform}`);
                }

                await strategy.executeAction({
                    socket,
                    authenticatedUserId,
                    action: request.action,
                    messageId: request.messageId,
                    targetUserId: request.targetUserId,
                    reason: request.reason,
                    duration: request.duration,
                    platformIds: request.platformIds
                });

            } catch (error) {
                SocketErrorHandler.emitModerationInternalError(socket, error);
            }
        });
    }

    /**
     * Verifica si la plataforma está soportada
     */
    private isSupportedPlatform(platform: string): platform is typeof SUPPORTED_PLATFORMS[number] {
        return SUPPORTED_PLATFORMS.includes(platform as any);
    }
}
