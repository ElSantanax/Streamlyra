import axios from 'axios';
import { YouTubeModerationService, YouTubeDeleteMessageParams, YouTubeBanUserParams } from '../YouTubeModerationService';
import { YouTubeQuotaManager } from '../../platforms/YouTubeQuotaManager';
import { YouTubeQuotaErrorHandler } from '../../platforms/youtube/YouTubeQuotaErrorHandler';

jest.mock('axios');
jest.mock('../../platforms/YouTubeQuotaManager');
jest.mock('../../platforms/youtube/YouTubeQuotaErrorHandler');
jest.mock('../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('YouTubeModerationService', () => {
    let service: YouTubeModerationService;
    let mockQuotaManager: jest.Mocked<YouTubeQuotaManager>;

    beforeEach(() => {
        service = new YouTubeModerationService();
        
        mockQuotaManager = {
            hasQuota: jest.fn(),
            consumeQuota: jest.fn(),
        } as unknown as jest.Mocked<YouTubeQuotaManager>;

        (YouTubeQuotaManager.getInstance as jest.Mock).mockReturnValue(mockQuotaManager);
        (YouTubeQuotaErrorHandler.handleQuotaError as jest.Mock).mockResolvedValue(undefined);
        
        jest.clearAllMocks();
    });

    describe('deleteMessage', () => {
        const validParams: YouTubeDeleteMessageParams = {
            messageId: 'message123',
            accessToken: 'valid_token'
        };

        it('debe eliminar mensaje cuando hay cuota disponible', async () => {
            mockQuotaManager.hasQuota.mockResolvedValue(true);
            mockedAxios.delete.mockResolvedValue({ status: 204 });

            await service.deleteMessage(validParams);

            expect(mockQuotaManager.hasQuota).toHaveBeenCalled();
            expect(mockedAxios.delete).toHaveBeenCalledWith(
                'https://www.googleapis.com/youtube/v3/liveChat/messages',
                expect.objectContaining({
                    params: { id: 'message123' },
                    headers: {
                        'Authorization': 'Bearer valid_token',
                        'Accept': 'application/json'
                    }
                })
            );
            expect(mockQuotaManager.consumeQuota).toHaveBeenCalled();
        });

        it('no debe eliminar mensaje cuando no hay cuota disponible', async () => {
            mockQuotaManager.hasQuota.mockResolvedValue(false);

            await expect(service.deleteMessage(validParams)).rejects.toThrow(
                'Cuota de YouTube agotada. Intenta mañana.'
            );

            expect(mockedAxios.delete).not.toHaveBeenCalled();
        });

        it('no debe eliminar mensaje cuando el token es inválido', async () => {
            mockQuotaManager.hasQuota.mockResolvedValue(true);
            mockedAxios.delete.mockRejectedValue({
                isAxiosError: true,
                response: { status: 401, data: { error: { message: 'Unauthorized' } } }
            });
            mockedAxios.isAxiosError.mockReturnValue(true);

            await expect(service.deleteMessage(validParams)).rejects.toThrow(
                'Token de acceso inválido o expirado'
            );
        });

        it('no debe eliminar mensaje cuando no hay permisos', async () => {
            mockQuotaManager.hasQuota.mockResolvedValue(true);
            mockedAxios.delete.mockRejectedValue({
                isAxiosError: true,
                response: { status: 403, data: { error: { message: 'Forbidden' } } }
            });
            mockedAxios.isAxiosError.mockReturnValue(true);

            await expect(service.deleteMessage(validParams)).rejects.toThrow(
                'No tienes permisos de moderador en este chat'
            );
        });
    });

    describe('banUser', () => {
        const validParams: YouTubeBanUserParams = {
            liveChatId: 'chat123',
            channelId: 'channel456',
            accessToken: 'valid_token'
        };

        it('debe banear usuario permanentemente cuando no se especifica duración', async () => {
            mockQuotaManager.hasQuota.mockResolvedValue(true);
            mockedAxios.post.mockResolvedValue({ status: 200, data: {} });

            await service.banUser(validParams);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://www.googleapis.com/youtube/v3/liveChat/bans',
                {
                    snippet: {
                        liveChatId: 'chat123',
                        type: 'permanent',
                        bannedUserDetails: { channelId: 'channel456' }
                    }
                },
                expect.any(Object)
            );
            expect(mockQuotaManager.consumeQuota).toHaveBeenCalled();
        });

        it('debe aplicar timeout cuando se especifica duración', async () => {
            mockQuotaManager.hasQuota.mockResolvedValue(true);
            mockedAxios.post.mockResolvedValue({ status: 200, data: {} });

            await service.banUser({
                ...validParams,
                duration: 300
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://www.googleapis.com/youtube/v3/liveChat/bans',
                {
                    snippet: {
                        liveChatId: 'chat123',
                        type: 'temporary',
                        bannedUserDetails: { channelId: 'channel456' },
                        banDurationSeconds: 300
                    }
                },
                expect.any(Object)
            );
        });

        it('no debe banear usuario cuando no hay cuota disponible', async () => {
            mockQuotaManager.hasQuota.mockResolvedValue(false);

            await expect(service.banUser(validParams)).rejects.toThrow(
                'Cuota de YouTube agotada. Intenta mañana.'
            );

            expect(mockedAxios.post).not.toHaveBeenCalled();
        });

        it('no debe banear usuario cuando la petición es inválida', async () => {
            mockQuotaManager.hasQuota.mockResolvedValue(true);
            mockedAxios.post.mockRejectedValue({
                isAxiosError: true,
                response: { status: 400, data: { error: { message: 'Bad request' } } }
            });
            mockedAxios.isAxiosError.mockReturnValue(true);

            await expect(service.banUser(validParams)).rejects.toThrow(
                'Petición inválida. Verifica el ID del canal'
            );
        });
    });
});
