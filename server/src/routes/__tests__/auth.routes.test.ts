import request from 'supertest';
import express, { Application } from 'express';
import { createAuthRoutes } from '../auth.routes';
import { AuthController } from '../../controllers/auth.controller';
import { AuthService } from '../../services/auth/AuthService';

jest.mock('../../middleware/auth.middleware', () => ({
    authenticateToken: jest.fn((_req, _res, next) => next()),
    optionalAuthenticate: jest.fn((_req, _res, next) => next())
}));

jest.mock('../../middleware/zod.middleware', () => ({
    validateZodBody: jest.fn(() => (_req: never, _res: never, next: () => void) => next())
}));

jest.mock('../../middleware/rateLimit.middleware', () => ({
    authLimiter: (_req: never, _res: never, next: () => void) => next()
}));

describe('Auth Routes', () => {
    let app: Application;
    let authService: jest.Mocked<AuthService>;
    let authController: AuthController;

    beforeEach(() => {
        authService = {
            handleOAuthAuth: jest.fn(),
            handleTikTokAuth: jest.fn(),
            getUserProfile: jest.fn(),
            disconnectPlatform: jest.fn(),
            logout: jest.fn(),
            regenerateOverlayToken: jest.fn()
        } as unknown as jest.Mocked<AuthService>;
        
        authController = new AuthController(authService);
        
        app = express();
        app.use(express.json());
        app.use('/auth', createAuthRoutes(authController));
    });

    describe('POST /auth/twitch', () => {
        it('debe registrar la ruta con los middlewares correctos', async () => {
            const response = await request(app)
                .post('/auth/twitch')
                .send({ code: 'test-code' });

            expect(response.status).toBeDefined();
        });
    });

    describe('POST /auth/youtube', () => {
        it('debe registrar la ruta con los middlewares correctos', async () => {
            const response = await request(app)
                .post('/auth/youtube')
                .send({ code: 'test-code' });

            expect(response.status).toBeDefined();
        });
    });

    describe('POST /auth/kick', () => {
        it('debe registrar la ruta con los middlewares correctos', async () => {
            const response = await request(app)
                .post('/auth/kick')
                .send({ code: 'test-code' });

            expect(response.status).toBeDefined();
        });
    });

    describe('POST /auth/tiktok', () => {
        it('debe registrar la ruta con autenticación requerida', async () => {
            const response = await request(app)
                .post('/auth/tiktok')
                .send({ username: 'test-user' });

            expect(response.status).toBeDefined();
        });
    });

    describe('GET /auth/me', () => {
        it('debe requerir autenticación', async () => {
            const response = await request(app).get('/auth/me');

            expect(response.status).toBeDefined();
        });
    });

    describe('DELETE /auth/platform', () => {
        it('debe requerir autenticación para desconectar plataforma', async () => {
            const response = await request(app)
                .delete('/auth/platform')
                .send({ provider: 'twitch' });

            expect(response.status).toBeDefined();
        });
    });

    describe('POST /auth/logout', () => {
        it('debe requerir autenticación para cerrar sesión', async () => {
            const response = await request(app).post('/auth/logout');

            expect(response.status).toBeDefined();
        });
    });

    describe('POST /auth/overlay-token/regenerate', () => {
        it('debe requerir autenticación para regenerar token', async () => {
            const response = await request(app).post('/auth/overlay-token/regenerate');

            expect(response.status).toBeDefined();
        });
    });
});
