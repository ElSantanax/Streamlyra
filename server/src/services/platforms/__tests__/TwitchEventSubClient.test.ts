import axios from 'axios';
import { TwitchEventSubClient } from '../TwitchEventSubClient';

jest.mock('axios');
jest.mock('../../../utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn()
    }
}));

describe('TwitchEventSubClient', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (TwitchEventSubClient as unknown as { appAccessToken: string | null; tokenExpiry: number }).appAccessToken = null;
        (TwitchEventSubClient as unknown as { appAccessToken: string | null; tokenExpiry: number }).tokenExpiry = 0;
    });

    describe('getAppAccessToken', () => {
        it('debe obtener y cachear token correctamente', async () => {
            const mockResponse = {
                data: {
                    access_token: 'app-token-123',
                    expires_in: 3600
                }
            };
            (axios.post as jest.Mock).mockResolvedValue(mockResponse);

            const token = await TwitchEventSubClient.getAppAccessToken();

            expect(token).toBe('app-token-123');
            expect(axios.post).toHaveBeenCalledWith(
                'https://id.twitch.tv/oauth2/token',
                null,
                expect.objectContaining({
                    params: expect.objectContaining({
                        grant_type: 'client_credentials'
                    })
                })
            );
        });

        it('debe reutilizar token cacheado si no ha expirado', async () => {
            const mockResponse = {
                data: {
                    access_token: 'cached-token',
                    expires_in: 3600
                }
            };
            (axios.post as jest.Mock).mockResolvedValue(mockResponse);

            await TwitchEventSubClient.getAppAccessToken();
            const token = await TwitchEventSubClient.getAppAccessToken();

            expect(token).toBe('cached-token');
            expect(axios.post).toHaveBeenCalledTimes(1);
        });
    });

    describe('subscribe', () => {
        it('debe crear suscripción correctamente', async () => {
            const mockTokenResponse = {
                data: {
                    access_token: 'app-token',
                    expires_in: 3600
                }
            };
            const mockSubscribeResponse = {
                data: {
                    data: [{ id: 'sub-123' }]
                }
            };
            (axios.post as jest.Mock)
                .mockResolvedValueOnce(mockTokenResponse)
                .mockResolvedValueOnce(mockSubscribeResponse);

            const result = await TwitchEventSubClient.subscribe(
                'stream.online',
                '1',
                { broadcaster_user_id: 'broadcaster-123' },
                'https://example.com/webhook',
                'secret-key'
            );

            expect(result.data[0].id).toBe('sub-123');
            expect(axios.post).toHaveBeenCalledWith(
                'https://api.twitch.tv/helix/eventsub/subscriptions',
                expect.objectContaining({
                    type: 'stream.online',
                    version: '1',
                    condition: { broadcaster_user_id: 'broadcaster-123' }
                }),
                expect.any(Object)
            );
        });
    });

    describe('deleteSubscription', () => {
        it('debe eliminar suscripción correctamente', async () => {
            const mockTokenResponse = {
                data: {
                    access_token: 'app-token',
                    expires_in: 3600
                }
            };
            (axios.post as jest.Mock).mockResolvedValue(mockTokenResponse);
            (axios.delete as jest.Mock).mockResolvedValue({ status: 204 });

            await TwitchEventSubClient.deleteSubscription('sub-123');

            expect(axios.delete).toHaveBeenCalledWith(
                'https://api.twitch.tv/helix/eventsub/subscriptions?id=sub-123',
                expect.any(Object)
            );
        });
    });

    describe('listSubscriptions', () => {
        it('debe listar suscripciones correctamente', async () => {
            const mockTokenResponse = {
                data: {
                    access_token: 'app-token',
                    expires_in: 3600
                }
            };
            const mockListResponse = {
                data: {
                    data: [
                        {
                            id: 'sub-1',
                            type: 'stream.online',
                            condition: { broadcaster_user_id: '123' },
                            status: 'enabled'
                        }
                    ]
                }
            };
            (axios.post as jest.Mock).mockResolvedValue(mockTokenResponse);
            (axios.get as jest.Mock).mockResolvedValue(mockListResponse);

            const result = await TwitchEventSubClient.listSubscriptions();

            expect(result).toHaveLength(1);
            expect(result[0].id).toBe('sub-1');
            expect(axios.get).toHaveBeenCalledWith(
                'https://api.twitch.tv/helix/eventsub/subscriptions',
                expect.any(Object)
            );
        });
    });
});
