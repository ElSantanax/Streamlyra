import axios from 'axios';
import { KickModerationService, KickDeleteMessageParams, KickBanUserParams } from '../KickModerationService';

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

describe('KickModerationService', () => {
    let service: KickModerationService;

    beforeEach(() => {
        service = new KickModerationService();
        jest.clearAllMocks();
    });

    describe('deleteMessage', () => {
        const validParams: KickDeleteMessageParams = {
            messageId: 'message123',
            accessToken: 'valid_token'
        };

        it('debe eliminar mensaje cuando los parámetros son válidos', async () => {
            mockedAxios.delete.mockResolvedValue({ status: 200, data: { success: true } });

            await service.deleteMessage(validParams);

            expect(mockedAxios.delete).toHaveBeenCalledWith(
                'https://api.kick.com/public/v1/chat/message123',
                expect.objectContaining({
                    headers: {
                        'Authorization': 'Bearer valid_token',
                        'Accept': '*/*'
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

        it('no debe eliminar mensaje cuando no hay permisos', async () => {
            mockedAxios.delete.mockRejectedValue({
                isAxiosError: true,
                response: { status: 403, data: { message: 'Forbidden' } }
            });
            mockedAxios.isAxiosError.mockReturnValue(true);

            await expect(service.deleteMessage(validParams)).rejects.toThrow(
                'No tienes permisos de moderador en este canal.'
            );
        });

        it('no debe eliminar mensaje cuando no existe', async () => {
            mockedAxios.delete.mockRejectedValue({
                isAxiosError: true,
                response: { status: 404, data: { message: 'Not found' } }
            });
            mockedAxios.isAxiosError.mockReturnValue(true);

            await expect(service.deleteMessage(validParams)).rejects.toThrow(
                'Mensaje no encontrado o ya fue eliminado (404)'
            );
        });
    });

    describe('banUser', () => {
        const validParams: KickBanUserParams = {
            broadcasterUserId: '123',
            userId: '456',
            accessToken: 'valid_token'
        };

        it('debe banear usuario permanentemente cuando no se especifica duración', async () => {
            mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

            await service.banUser(validParams);

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.kick.com/public/v1/moderation/bans',
                {
                    broadcaster_user_id: 123,
                    user_id: 456
                },
                expect.any(Object)
            );
        });

        it('debe aplicar timeout cuando se especifica duración', async () => {
            mockedAxios.post.mockResolvedValue({ status: 200, data: { success: true } });

            await service.banUser({
                ...validParams,
                duration: 600,
                reason: 'Spam'
            });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                'https://api.kick.com/public/v1/moderation/bans',
                {
                    broadcaster_user_id: 123,
                    user_id: 456,
                    duration: 600,
                    reason: 'Spam'
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
                'Token de acceso inválido o expirado.'
            );
        });

        it('no debe banear usuario cuando la petición es inválida', async () => {
            mockedAxios.post.mockRejectedValue({
                isAxiosError: true,
                response: { status: 400, data: { message: 'Bad request' } }
            });
            mockedAxios.isAxiosError.mockReturnValue(true);

            await expect(service.banUser(validParams)).rejects.toThrow(
                'Petición inválida. Verifica los IDs o si el usuario ya está baneado.'
            );
        });
    });

    describe('unbanUser', () => {
        it('debe desbanear usuario cuando los parámetros son válidos', async () => {
            mockedAxios.delete.mockResolvedValue({ status: 200, data: { success: true } });

            await service.unbanUser('123', '456', 'valid_token');

            expect(mockedAxios.delete).toHaveBeenCalledWith(
                'https://api.kick.com/public/v1/moderation/bans',
                expect.objectContaining({
                    data: {
                        broadcaster_user_id: 123,
                        user_id: 456
                    },
                    headers: {
                        'Authorization': 'Bearer valid_token',
                        'Content-Type': 'application/json',
                        'Accept': '*/*'
                    }
                })
            );
        });

        it('no debe desbanear usuario cuando no está en la lista de baneados', async () => {
            mockedAxios.delete.mockRejectedValue({
                isAxiosError: true,
                response: { status: 404, data: { message: 'Not found' } }
            });
            mockedAxios.isAxiosError.mockReturnValue(true);

            await expect(service.unbanUser('123', '456', 'valid_token')).rejects.toThrow(
                'Usuario no encontrado en la lista de baneados.'
            );
        });
    });
});
