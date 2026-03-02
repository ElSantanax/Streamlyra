import axios from 'axios';
import { KickService } from '../KickService';

jest.mock('axios');
jest.mock('../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    }
}));

describe('KickService', () => {
    let service: KickService;
    const mockAccessToken = 'test-access-token';

    beforeEach(() => {
        jest.clearAllMocks();
        service = new KickService();
    });

    describe('sendChatMessage', () => {
        it('debe enviar mensaje de chat correctamente', async () => {
            const mockResponse = {
                data: { data: { message_id: 'msg-123' } }
            };
            (axios.post as jest.Mock).mockResolvedValue(mockResponse);

            const result = await service.sendChatMessage(
                mockAccessToken,
                '12345',
                'Hello world'
            );

            expect(result).toBe('msg-123');
            expect(axios.post).toHaveBeenCalledWith(
                expect.stringContaining('/chat'),
                expect.objectContaining({
                    content: 'Hello world',
                    broadcaster_user_id: 12345
                }),
                expect.any(Object)
            );
        });

        it('debe retornar ID generado cuando respuesta no tiene message_id', async () => {
            (axios.post as jest.Mock).mockResolvedValue({ data: {} });

            const result = await service.sendChatMessage(
                mockAccessToken,
                '12345',
                'Hello'
            );

            expect(result).toMatch(/^kick-\d+$/);
        });

        it('debe manejar error 401 correctamente', async () => {
            const error = {
                isAxiosError: true,
                response: { status: 401, data: {} }
            };
            (axios.post as jest.Mock).mockRejectedValue(error);
            jest.spyOn(axios, 'isAxiosError').mockReturnValue(true);

            await expect(service.sendChatMessage(mockAccessToken, '12345', 'test'))
                .rejects
                .toThrow('Token de acceso inválido o expirado en Kick');
        });
    });

    describe('getChannels', () => {
        it('debe obtener canales correctamente', async () => {
            const mockChannels = {
                data: [
                    { id: 1, name: 'channel1' },
                    { id: 2, name: 'channel2' }
                ]
            };
            (axios.get as jest.Mock).mockResolvedValue({ data: mockChannels });

            const channelsPromise = KickService.getChannels(mockAccessToken);

            await expect(channelsPromise).resolves.toEqual(mockChannels.data);
            expect(axios.get).toHaveBeenCalledWith(
                expect.stringContaining('/channels'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'Authorization': `Bearer ${mockAccessToken}`
                    })
                })
            );
        });
    });
});
