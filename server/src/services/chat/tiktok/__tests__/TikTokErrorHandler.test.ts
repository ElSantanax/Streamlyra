import { TikTokErrorHandler } from '../TikTokErrorHandler';

describe('TikTokErrorHandler', () => {
    let errorHandler: TikTokErrorHandler;
    const username = 'testuser';

    beforeEach(() => {
        errorHandler = new TikTokErrorHandler();
    });

    it('debe categorizar user_not_found', () => {
        const error = new Error('user_not_found');
        const info = errorHandler.categorizeError(error, username);
        expect(info.type).toBe('user_not_found');
        expect(info.isPermanent).toBe(true);
        expect(info.userMessage).toContain(username);
    });

    it('debe categorizar user_not_found desde AggregateErrors', () => {
        const error = { aggregateErrors: [{ message: 'Something user_not_found else' }] };
        const info = errorHandler.categorizeError(error, username);
        expect(info.type).toBe('user_not_found');
    });

    it('debe categorizar private_account', () => {
        const error = 'This account is private';
        const info = errorHandler.categorizeError(error, username);
        expect(info.type).toBe('private_account');
        expect(info.isPermanent).toBe(true);
    });

    it('debe categorizar blocked (429)', () => {
        const error = 'Error 429: TooManyRequests';
        const info = errorHandler.categorizeError(error, username);
        expect(info.type).toBe('blocked');
        expect(info.isPermanent).toBe(false);
    });

    it('debe categorizar not_live', () => {
        const error = 'LIVE_ACCESS_ROOM_ERROR: User is not live';
        const info = errorHandler.categorizeError(error, username);
        expect(info.type).toBe('not_live');
        expect(info.isPermanent).toBe(false);
    });

    it('debe categorizar timeout', () => {
        const error = 'Connection timeout reached';
        const info = errorHandler.categorizeError(error, username);
        expect(info.type).toBe('timeout');
        expect(info.isPermanent).toBe(false);
    });

    it('debe categorizar errores desconocidos como unknown', () => {
        const error = 'Something weird happened';
        const info = errorHandler.categorizeError(error, username);
        expect(info.type).toBe('unknown');
        expect(info.isPermanent).toBe(false);
    });
});
