import axios from 'axios';
import { TwitchModerationService, DeleteMessageParams, BanUserParams } from '../TwitchModerationService';
import { config } from '../../../config';

jest.mock('axios');
jest.mock('../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn()
    }
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('TwitchModerationService', () => {
    let service: TwitchModerationService;

    beforeEach(() => {
        service = new TwitchModerationService();
        jest.clearAllMocks();
    });

    describe('deleteMessage', () => {
        const validParams: DeleteMessageParams = {
            broadcasterId: 'broadcaster123',
            moderatorId: 'moderator456',
            messageId: 'message789',
            accessToken: 'valid_token'
        };

        it('debe eliminar mensaje cuando los parámetros son válidos', async () => {
            mockedAxios.delete.mockResolvedValue({ status: 204 });

            await service.deleteMessage(validParams);

            expect(mockedAxios.delete).toHaveBeenCalledWith(
                'https://api.twitch.tv/helix/moderation/chat',
                expect.objectContaining({
                    params: {
                        broadcaster_id: 'broadcaster123',
                        moderator_id: 'moderator456',
                        message_id: 'message789'
                    },
                    headers: {
                        'Authorization': 'Bearer valid_token',
                        'Client-ID': config.oauth.twitch.clientId
                    }
                })
            );
        });

        it('no debe eliminar mensaje cuando el token es inválido', async () => {
            mockedAxios.delete.mockRejectedValue({
                isAxiosError: true,
                response: { status: 401, data: { message: 'Unauthorized' } }
            });
            mockedAxios.isAxiosError.mockReturnValue(true);

            await expect(service.deleteMessage(validParams)).rejects.toThrow(
                'Token de acceso inválido o expirado'
            );
        });

        it('no debe eliminar mensaje cuando no hay permisos de moderador', async () => {
            mockedAxios.delete.mockRejectedValue({
                isAxiosError: true,
                response: { status: 403, data: { message: 'Forbidden' } }
            });
            mockedAxios.isAxiosError.mockReturnValue(true);

            await expect(service.deleteMessage(validParams)).rejects.toThrow(
                'No tienes permisos de moderador en este canal'
            );
        });

        it('no debe eliminar mensaje cuando el mensaje no existe', async () => {
            mockedAxios.delete.mockRejectedValue({
                isAxiosError: true,
                response: { status: 404, data: { message: 'Not found' } }
            });
            mockedAxios.isAxiosError.mockReturnValue(true);

            await expect(service.deleteMessage(validParams)).rejects.toThrow(
                'Mensaje no encontrado o ya fue eliminado'
            );
        });
    });

    describe('banUser', () => {
        const validParams: BanUserParams = {
            broadcasterId: 'broadcaster123',
            moderatorId: 'moderator456',
            userId: 'user789',
            accessToken: 'valid_token'
        };

        it('debe banear usuario cuando los parámetros son válidos', async () => {
            mockedAxios.post.mockResolvedValue({ status: 200 });

            await service.banUser(validParams);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.twitch.tv/helix/moderation/bans',
                { data: { user_id: 'user789' } },
                expect.objectContaining({
                    params: {
                        broadcaster_id: 'broadcaster123',
                        moderator_id: 'moderator456'
                    }
                })
            );
        });

        it('debe incluir razón y duración cuando se proporcionan', async () => {
            mockedAxios.post.mockResolvedValue({ status: 200 });

            await service.banUser({
                ...validParams,
                reason: 'Spam',
                duration: 600
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.twitch.tv/helix/moderation/bans',
                {
                    data: {
                        user_id: 'user789',
                        reason: 'Spam',
                        duration: 600
                    }
                },
                expect.any(Object)
            );
        });

        it('no debe banear usuario cuando el token es inválido', async () => {
            mockedAxios.post.mockRejectedValue({
                isAxiosError: true,
                response: { status: 401, data: { message: 'Unauthorized' } }
            });
            mockedAxios.isAxiosError.mockReturnValue(true);

            await expect(service.banUser(validParams)).rejects.toThrow(
                'Token de acceso inválido o expirado'
            );
        });

        it('no debe banear usuario cuando no se puede banear', async () => {
            mockedAxios.post.mockRejectedValue({
                isAxiosError: true,
                response: { status: 400, data: { message: 'Bad request' } }
            });
            mockedAxios.isAxiosError.mockReturnValue(true);

            await expect(service.banUser(validParams)).rejects.toThrow(
                'No puedes banear a este usuario'
            );
        });
    });
});
