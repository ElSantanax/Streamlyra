import { YouTubeTokenDecoder } from '../YouTubeTokenDecoder';

jest.mock('../../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn()
    }
}));

describe('YouTubeTokenDecoder', () => {
    describe('getBasicProfileFromToken', () => {
        it('debe decodificar token válido y extraer channelId del payload', () => {
            const payload = { sub: 'channel-123' };
            const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
            const token = `header.${payloadBase64}.signature`;

            const result = YouTubeTokenDecoder.getBasicProfileFromToken(token);

            expect(result.id).toBe('channel-123');
            expect(result.snippet.title).toBe('YouTube User channel-');
            expect(result.snippet.thumbnails?.default?.url).toBe('');
        });

        it('debe usar timestamp como fallback cuando payload no tiene sub', () => {
            const payload = {};
            const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
            const token = `header.${payloadBase64}.signature`;

            const result = YouTubeTokenDecoder.getBasicProfileFromToken(token);

            expect(result.id).toMatch(/^yt_\d+$/);
            expect(result.snippet.title).toMatch(/^YouTube User yt_\d{5}$/);
        });

        it('debe retornar perfil fallback cuando token tiene formato inválido', () => {
            const invalidToken = 'invalid-token-format';

            const result = YouTubeTokenDecoder.getBasicProfileFromToken(invalidToken);

            expect(result.id).toMatch(/^yt_\d+$/);
            expect(result.snippet.title).toMatch(/^YouTube User yt_\d{5}$/);
            expect(result.snippet.thumbnails?.default?.url).toBe('');
        });

        it('debe retornar perfil fallback cuando payload no es JSON válido', () => {
            const invalidBase64 = Buffer.from('not-valid-json').toString('base64');
            const token = `header.${invalidBase64}.signature`;

            const result = YouTubeTokenDecoder.getBasicProfileFromToken(token);

            expect(result.id).toMatch(/^yt_\d+$/);
            expect(result.snippet.title).toMatch(/^YouTube User yt_\d{5}$/);
        });
    });
});
