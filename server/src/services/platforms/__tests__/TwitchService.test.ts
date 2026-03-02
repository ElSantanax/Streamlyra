import axios from 'axios';
import { TwitchService } from '../TwitchService';

jest.mock('axios');

describe('TwitchService', () => {
    let service: TwitchService;
    const mockAccessToken = 'test-twitch-token';

    beforeEach(() => {
        jest.clearAllMocks();
        service = new TwitchService();
    });

    describe('sendChatMessage', () => {
        it('debe enviar mensaje correctamente', async () => {
            const mockResponse = {
                status: 200,
                data: {
                    data: [{
                        is_sent: true,
                        message_id: 'msg-123'
                    }]
                }
            };
            (axios.post as jest.Mock).mockResolvedValue(mockResponse);

            const messagePromise = service.sendChatMessage(
                mockAccessToken,
                'broadcaster-123',
                'sender-456',
                'Hello Twitch'
            );

            await expect(messagePromise).resolves.toBe('msg-123');
        });

        it('debe lanzar error cuando mensaje no fue enviado', async () => {
            const mockResponse = {
                status: 200,
                data: {
                    data: [{
                        is_sent: false,
                        message_id: 'msg-failed'
                    }]
                }
            };
            (axios.post as jest.Mock).mockResolvedValue(mockResponse);

            const messagePromise = service.sendChatMessage(
                mockAccessToken,
                'broadcaster-123',
                'sender-456',
                'Test'
            );

            await expect(messagePromise).rejects.toThrow('Twitch reportó que el mensaje no fue enviado');
        });

        it('debe manejar error 401 correctamente', async () => {
            const error = new Error('Unauthorized');
            Object.assign(error, {
                isAxiosError: true,
                response: {
                    status: 401,
                    data: {}
                }
            });
            (axios.post as jest.Mock).mockRejectedValue(error);
            jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

            const messagePromise = service.sendChatMessage(
                mockAccessToken,
                'broadcaster-123',
                'sender-456',
                'Test'
            );

            await expect(messagePromise).rejects.toThrow('Token de acceso inválido o expirado');
        });

        it('debe manejar error 403 correctamente', async () => {
            const error = {
                isAxiosError: true,
                response: {
                    status: 403,
                    data: {}
                }
            };
            (axios.post as jest.Mock).mockRejectedValue(error);
            jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

            const messagePromise = service.sendChatMessage(
                mockAccessToken,
                'broadcaster-123',
                'sender-456',
                'Test'
            );

            await expect(messagePromise).rejects.toThrow('No tienes permisos para enviar mensajes en este canal');
        });

        it('debe manejar error 429 correctamente', async () => {
            const error = {
                isAxiosError: true,
                response: {
                    status: 429,
                    data: {}
                }
            };
            (axios.post as jest.Mock).mockRejectedValue(error);
            jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

            const messagePromise = service.sendChatMessage(
                mockAccessToken,
                'broadcaster-123',
                'sender-456',
                'Test'
            );

            await expect(messagePromise).rejects.toThrow('Límite de tasa excedido');
        });
    });
});
