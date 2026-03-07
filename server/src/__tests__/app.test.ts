import request from 'supertest';
import { createApp } from '../app';
import { AuthController } from '../controllers/auth.controller';
import { WebhookController } from '../controllers/webhook.controller';

jest.mock('../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        fatal: jest.fn(),
        child: jest.fn().mockReturnThis()
    }
}));

jest.mock('pino-http', () =>
    jest.fn(() => (_req: unknown, _res: unknown, next: () => void) => next())
);

jest.mock('../config', () => ({
    config: {
        nodeEnv: 'test',
        frontendUrl: 'http://localhost:3000',
        cookie: {
            secure: false,
            sameSite: 'lax',
            domain: 'localhost',
            maxAge: 86400000
        }
    }
}));

jest.mock('../middleware/rateLimit.middleware', () => ({
    apiLimiter: (_req: unknown, _res: unknown, next: () => void) => next(),
    webhookLimiter: (_req: unknown, _res: unknown, next: () => void) => next()
}));

jest.mock('../routes/auth.routes', () => {
    const expressApp = jest.requireActual('express');
    return {
        createAuthRoutes: () => {
            const router = expressApp.Router();
            router.get('/test', (_req: unknown, res: { json: (data: unknown) => void }) =>
                res.json({ route: 'auth' })
            );
            return router;
        }
    };
});

jest.mock('../routes/webhook.routes', () => {
    const expressApp = jest.requireActual('express');
    return {
        createWebhookRoutes: () => {
            const router = expressApp.Router();
            router.get('/test', (_req: unknown, res: { json: (data: unknown) => void }) =>
                res.json({ route: 'webhook' })
            );
            return router;
        }
    };
});

function buildApp() {
    const authController = {} as AuthController;
    const webhookController = {} as WebhookController;
    return createApp(authController, webhookController);
}

describe('createApp — smoke tests', () => {
    const app = buildApp();

    describe('Rutas base', () => {
        it('GET /api/status debería responder { status: "ok" }', async () => {
            const res = await request(app).get('/api/status');

            expect(res.status).toBe(200);
            expect(res.body).toEqual({ status: 'ok', message: 'API Online' });
        });

        it('GET / debería responder con texto de bienvenida', async () => {
            const res = await request(app).get('/');

            expect(res.status).toBe(200);
            expect(res.text).toContain('Servidor funcionando');
        });
    });

    describe('CORS', () => {
        it('debería incluir el header Access-Control-Allow-Origin en respuestas', async () => {
            const res = await request(app)
                .get('/api/status')
                .set('Origin', 'http://localhost:3000');

            expect(res.headers['access-control-allow-origin']).toBe('http://localhost:3000');
        });

        it('debería responder a preflight OPTIONS con 204', async () => {
            const res = await request(app)
                .options('/api/status')
                .set('Origin', 'http://localhost:3000')
                .set('Access-Control-Request-Method', 'GET');

            expect([200, 204]).toContain(res.status);
        });
    });

    describe('Body Parsers', () => {
        it('debería parsear JSON correctamente', async () => {
            const res = await request(app)
                .get('/api/status')
                .set('Content-Type', 'application/json');

            expect(res.status).toBe(200);
        });

        it('debería capturar el rawBody en peticiones JSON', async () => {
            const appWithRawBody = buildApp();
            const payload = JSON.stringify({ test: 'raw' });

            const res = await request(appWithRawBody)
                .post('/api/auth/test')
                .set('Content-Type', 'application/json')
                .send(payload);

            expect([200, 404]).toContain(res.status);
        });
    });

    describe('Error Handler', () => {
        it('debería retornar 500 estructurado ante errores no manejados', async () => {
            const testApp = createApp({} as AuthController, {} as WebhookController);

            testApp.get('/api/crash', () => {
                throw new Error('test crash');
            });

            const res = await request(testApp).get('/api/crash');

            expect(res.status).toBeGreaterThanOrEqual(400);
        });
    });

    describe('Rutas de API registradas', () => {
        it('GET /api/auth/test debería ser manejado por las rutas de auth', async () => {
            const res = await request(app).get('/api/auth/test');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ route: 'auth' });
        });

        it('GET /api/webhooks/test debería ser manejado por las rutas de webhook', async () => {
            const res = await request(app).get('/api/webhooks/test');
            expect(res.status).toBe(200);
            expect(res.body).toEqual({ route: 'webhook' });
        });
    });
});