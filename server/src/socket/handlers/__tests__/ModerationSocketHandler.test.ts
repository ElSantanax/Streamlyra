import { Socket } from 'socket.io';
import { ModerationSocketHandler } from '../ModerationSocketHandler';
import { TwitchModerationService } from '../../../services/moderation/TwitchModerationService';
import { KickModerationService } from '../../../services/moderation/KickModerationService';
import { YouTubeModerationService } from '../../../services/moderation/YouTubeModerationService';
import { ConnectionService } from '../../../services/connection/ConnectionService';
import { YouTubeService } from '../../../services/platforms/YouTubeService';

type MockedFunction<T extends (...args: never[]) => unknown> = jest.MockedFunction<T>;

function getMockCall<T extends (...args: never[]) => unknown>(
    mockFn: MockedFunction<T>,
    callIndex: number,
    argIndex: number
): unknown {
    return mockFn.mock.calls[callIndex]?.[argIndex];
}

describe('ModerationSocketHandler', () => {
    let handler: ModerationSocketHandler;
    let mockSocket: jest.Mocked<Socket>;
    let mockTwitchService: jest.Mocked<TwitchModerationService>;
    let mockKickService: jest.Mocked<KickModerationService>;
    let mockYouTubeService: jest.Mocked<YouTubeModerationService>;
    let mockConnectionService: jest.Mocked<ConnectionService>;
    let mockYouTubePlatformService: jest.Mocked<YouTubeService>;
    const authenticatedUserId = 'user-123';

    beforeEach(() => {
        mockTwitchService = {} as jest.Mocked<TwitchModerationService>;
        mockKickService = {} as jest.Mocked<KickModerationService>;
        mockYouTubeService = {} as jest.Mocked<YouTubeModerationService>;
        mockConnectionService = {
            getConnectionByUserAndPlatform: jest.fn()
        } as unknown as jest.Mocked<ConnectionService>;
        mockYouTubePlatformService = {} as jest.Mocked<YouTubeService>;

        mockSocket = {
            id: 'socket-123',
            on: jest.fn(),
            emit: jest.fn()
        } as unknown as jest.Mocked<Socket>;

        handler = new ModerationSocketHandler(
            mockTwitchService,
            mockKickService,
            mockYouTubeService,
            mockConnectionService,
            mockYouTubePlatformService
        );
    });

    describe('setupHandler', () => {
        it('debe registrar el evento moderation_action', () => {
            handler.setupHandler(mockSocket, authenticatedUserId);

            expect(mockSocket.on).toHaveBeenCalledWith('moderation_action', expect.any(Function));
        });

        it('no debe procesar cuando el payload es inválido', async () => {
            const invalidPayload = { action: 'ban' };

            handler.setupHandler(mockSocket, authenticatedUserId);
            const moderationHandler = getMockCall(mockSocket.on as MockedFunction<typeof mockSocket.on>, 0, 1) as (payload: unknown) => Promise<void>;
            await moderationHandler(invalidPayload);

            expect(mockSocket.emit).toHaveBeenCalledWith('moderation_error', expect.objectContaining({
                code: 'INVALID_PAYLOAD'
            }));
        });

        it('no debe procesar cuando el userId no coincide', async () => {
            const payload = {
                userId: 'different-user',
                platform: 'twitch',
                action: 'ban',
                targetUserId: 'target-123'
            };

            handler.setupHandler(mockSocket, authenticatedUserId);
            const moderationHandler = getMockCall(mockSocket.on as MockedFunction<typeof mockSocket.on>, 0, 1) as (payload: unknown) => Promise<void>;
            await moderationHandler(payload);

            expect(mockSocket.emit).toHaveBeenCalledWith('moderation_error', expect.objectContaining({
                code: 'UNAUTHORIZED'
            }));
        });

        it('no debe procesar cuando la plataforma no está soportada', async () => {
            const payload = {
                userId: authenticatedUserId,
                platform: 'tiktok',
                action: 'ban',
                targetUserId: 'target-123'
            };

            handler.setupHandler(mockSocket, authenticatedUserId);
            const moderationHandler = getMockCall(mockSocket.on as MockedFunction<typeof mockSocket.on>, 0, 1) as (payload: unknown) => Promise<void>;
            await moderationHandler(payload);

            expect(mockSocket.emit).toHaveBeenCalledWith('moderation_error', expect.objectContaining({
                code: 'UNSUPPORTED_PLATFORM'
            }));
        });
    });
});
