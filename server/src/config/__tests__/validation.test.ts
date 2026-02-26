import { validateConfig, emitConfigWarnings } from '../validation';

describe('validation', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        jest.resetModules();
        process.env = { ...originalEnv };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    describe('validateConfig', () => {
        const setRequiredEnvVars = () => {
            process.env.DATABASE_URL = 'postgresql://localhost:5432/test';
            process.env.JWT_SECRET = 'test-jwt-secret';
            process.env.TWITCH_CLIENT_ID = 'twitch-client-id';
            process.env.TWITCH_CLIENT_SECRET = 'twitch-client-secret';
            process.env.TWITCH_REDIRECT_URI = 'http://localhost:4000/auth/twitch/callback';
            process.env.YOUTUBE_CLIENT_ID = 'youtube-client-id';
            process.env.YOUTUBE_CLIENT_SECRET = 'youtube-client-secret';
            process.env.YOUTUBE_REDIRECT_URI = 'http://localhost:4000/auth/youtube/callback';
            process.env.KICK_CLIENT_ID = 'kick-client-id';
            process.env.KICK_CLIENT_SECRET = 'kick-client-secret';
            process.env.KICK_REDIRECT_URI = 'http://localhost:4000/auth/kick/callback';
            process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
            process.env.APP_URL = 'http://localhost:4000';
        };

        it('debe validar correctamente cuando todas las variables requeridas están presentes', () => {
            setRequiredEnvVars();

            expect(() => validateConfig()).not.toThrow();
        });

        it('debe lanzar error cuando falta DATABASE_URL', () => {
            setRequiredEnvVars();
            delete process.env.DATABASE_URL;

            expect(() => validateConfig()).toThrow('Missing required environment variables');
            expect(() => validateConfig()).toThrow('DATABASE_URL');
        });

        it('debe lanzar error cuando faltan múltiples variables', () => {
            setRequiredEnvVars();
            delete process.env.DATABASE_URL;
            delete process.env.JWT_SECRET;
            delete process.env.ENCRYPTION_KEY;

            expect(() => validateConfig()).toThrow('Missing required environment variables');
            expect(() => validateConfig()).toThrow('DATABASE_URL');
            expect(() => validateConfig()).toThrow('JWT_SECRET');
            expect(() => validateConfig()).toThrow('ENCRYPTION_KEY');
        });

        it('debe validar correctamente COOKIE_SAMESITE con valor lax', () => {
            setRequiredEnvVars();
            process.env.COOKIE_SAMESITE = 'lax';

            expect(() => validateConfig()).not.toThrow();
        });

        it('debe validar correctamente COOKIE_SAMESITE con valor none', () => {
            setRequiredEnvVars();
            process.env.COOKIE_SAMESITE = 'none';

            expect(() => validateConfig()).not.toThrow();
        });

        it('debe validar correctamente COOKIE_SAMESITE con valor strict', () => {
            setRequiredEnvVars();
            process.env.COOKIE_SAMESITE = 'strict';

            expect(() => validateConfig()).not.toThrow();
        });

        it('debe lanzar error cuando COOKIE_SAMESITE tiene valor inválido', () => {
            setRequiredEnvVars();
            process.env.COOKIE_SAMESITE = 'invalid';

            expect(() => validateConfig()).toThrow('Invalid COOKIE_SAMESITE value');
            expect(() => validateConfig()).toThrow('Expected one of: lax, none, strict');
        });

        it('debe validar correctamente COOKIE_SECURE con valor true', () => {
            setRequiredEnvVars();
            process.env.COOKIE_SECURE = 'true';

            expect(() => validateConfig()).not.toThrow();
        });

        it('debe validar correctamente COOKIE_SECURE con valor false', () => {
            setRequiredEnvVars();
            process.env.COOKIE_SECURE = 'false';

            expect(() => validateConfig()).not.toThrow();
        });

        it('debe lanzar error cuando COOKIE_SECURE tiene valor inválido', () => {
            setRequiredEnvVars();
            process.env.COOKIE_SECURE = 'invalid';

            expect(() => validateConfig()).toThrow('Invalid COOKIE_SECURE value');
            expect(() => validateConfig()).toThrow('Expected true or false');
        });

        it('debe validar correctamente ENCRYPTION_KEY con formato hexadecimal válido', () => {
            setRequiredEnvVars();
            process.env.ENCRYPTION_KEY = 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

            expect(() => validateConfig()).not.toThrow();
        });

        it('debe lanzar error cuando ENCRYPTION_KEY no tiene 64 caracteres', () => {
            setRequiredEnvVars();
            process.env.ENCRYPTION_KEY = '0123456789abcdef';

            expect(() => validateConfig()).toThrow('Invalid ENCRYPTION_KEY');
            expect(() => validateConfig()).toThrow('Must be a 64-character hex string');
        });

        it('debe lanzar error cuando ENCRYPTION_KEY contiene caracteres no hexadecimales', () => {
            setRequiredEnvVars();
            process.env.ENCRYPTION_KEY = 'zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz';

            expect(() => validateConfig()).toThrow('Invalid ENCRYPTION_KEY');
        });

        it('debe validar correctamente cuando COOKIE_SAMESITE está vacío', () => {
            setRequiredEnvVars();
            process.env.COOKIE_SAMESITE = '';

            expect(() => validateConfig()).not.toThrow();
        });

        it('debe validar correctamente cuando COOKIE_SECURE está vacío', () => {
            setRequiredEnvVars();
            process.env.COOKIE_SECURE = '';

            expect(() => validateConfig()).not.toThrow();
        });

        it('debe ser case-insensitive para COOKIE_SAMESITE', () => {
            setRequiredEnvVars();
            process.env.COOKIE_SAMESITE = 'LAX';

            expect(() => validateConfig()).not.toThrow();
        });

        it('debe ser case-insensitive para COOKIE_SECURE', () => {
            setRequiredEnvVars();
            process.env.COOKIE_SECURE = 'TRUE';

            expect(() => validateConfig()).not.toThrow();
        });
    });

    describe('emitConfigWarnings', () => {
        const mockLogger = {
            warn: jest.fn()
        };

        beforeEach(() => {
            mockLogger.warn.mockClear();
        });

        it('debe emitir warning cuando KICK_WEBHOOK_SKIP_SIGNATURE es true en producción', () => {
            process.env.NODE_ENV = 'production';
            process.env.KICK_WEBHOOK_SKIP_SIGNATURE = 'true';

            emitConfigWarnings(mockLogger);

            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('ADVERTENCIA DE SEGURIDAD')
            );
            expect(mockLogger.warn).toHaveBeenCalledWith(
                expect.stringContaining('KICK_WEBHOOK_SKIP_SIGNATURE')
            );
        });

        it('no debe emitir warning cuando KICK_WEBHOOK_SKIP_SIGNATURE es false en producción', () => {
            process.env.NODE_ENV = 'production';
            process.env.KICK_WEBHOOK_SKIP_SIGNATURE = 'false';

            emitConfigWarnings(mockLogger);

            expect(mockLogger.warn).not.toHaveBeenCalled();
        });

        it('no debe emitir warning cuando KICK_WEBHOOK_SKIP_SIGNATURE es true en desarrollo', () => {
            process.env.NODE_ENV = 'development';
            process.env.KICK_WEBHOOK_SKIP_SIGNATURE = 'true';

            emitConfigWarnings(mockLogger);

            expect(mockLogger.warn).not.toHaveBeenCalled();
        });

        it('no debe emitir warning cuando NODE_ENV no es producción', () => {
            process.env.NODE_ENV = 'test';
            process.env.KICK_WEBHOOK_SKIP_SIGNATURE = 'true';

            emitConfigWarnings(mockLogger);

            expect(mockLogger.warn).not.toHaveBeenCalled();
        });
    });
});
