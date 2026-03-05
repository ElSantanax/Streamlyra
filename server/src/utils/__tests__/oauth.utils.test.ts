import { OAuthUtils } from '../oauth.utils';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('OAuthUtils', () => {
    const options = {
        baseUrl: 'https://oauth.test/token',
        clientId: 'cid',
        clientSecret: 'csec',
        redirectUri: 'https://app.test/cb'
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('exchangeCode', () => {
        it('debería intercambiar el código usando JSON por defecto', async () => {
            mockedAxios.post.mockResolvedValue({ data: { access_token: 'at1' } });

            const res = await OAuthUtils.exchangeCode('auth_code', options);

            expect(res).toEqual({ access_token: 'at1' });
            expect(mockedAxios.post).toHaveBeenCalledWith(
                options.baseUrl,
                expect.objectContaining({
                    code: 'auth_code',
                    client_id: 'cid',
                    grant_type: 'authorization_code',
                    redirect_uri: 'https://app.test/cb'
                }),
                expect.not.objectContaining({ headers: expect.anything() })
            );
        });

        it('debería usar form-urlencoded si se especifica', async () => {
            mockedAxios.post.mockResolvedValue({ data: { access_token: 'at2' } });

            await OAuthUtils.exchangeCode('auth_code', { ...options, contentType: 'form' });

            expect(mockedAxios.post).toHaveBeenCalledWith(
                expect.anything(),
                expect.anything(),
                expect.objectContaining({
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
                })
            );

            // Probar transformRequest
            const config = mockedAxios.post.mock.calls[0][2];
            const transformers = config?.transformRequest;
            const transformer = Array.isArray(transformers) ? transformers[0] : transformers;
            const transformed = (transformer as (data: Record<string, string>) => string)({ foo: 'bar' });
            expect(transformed).toContain('foo=bar');
        });
    });

    describe('refreshTokens', () => {
        it('debería solicitar un nuevo token de acceso usando el refresh token', async () => {
            mockedAxios.post.mockResolvedValue({ data: { access_token: 'new_at' } });

            const res = await OAuthUtils.refreshTokens('rt1', options);

            expect(res).toEqual({ access_token: 'new_at' });
            expect(mockedAxios.post).toHaveBeenCalledWith(
                options.baseUrl,
                expect.objectContaining({
                    refresh_token: 'rt1',
                    grant_type: 'refresh_token'
                }),
                expect.anything()
            );
        });
    });
});
