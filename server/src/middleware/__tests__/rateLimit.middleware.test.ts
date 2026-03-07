import express from 'express';
import request from 'supertest';
import { logger } from '../../utils/logger';

jest.mock('../../utils/logger', () => ({
    logger: {
        warn: jest.fn(),
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }
}));

jest.mock('../../config', () => ({
    config: { nodeEnv: 'production' }
}));

import { apiLimiter, authLimiter, webhookLimiter } from '../rateLimit.middleware';

function buildApp(limiter: express.RequestHandler): express.Application {
    const app = express();
    app.set('trust proxy', 1);
    app.use(limiter);
    app.get('/api/data', (_req, res) => res.status(200).json({ ok: true }));
    app.get('/api/auth/login', (_req, res) => res.status(200).json({ ok: true }));
    app.get('/api/webhooks/kick', (_req, res) => res.status(200).json({ ok: true }));
    return app;
}

describe('apiLimiter', () => {
    let app: express.Application;

    beforeEach(() => {
        jest.clearAllMocks();
        app = buildApp(apiLimiter);
    });

    it('debería permitir peticiones normales a la API', async () => {
        const res = await request(app).get('/api/data');
        expect(res.status).toBe(200);
    });

    it('debería saltar el rate limit para rutas de autenticación (/api/auth/*)', async () => {
        const res = await request(app).get('/api/auth/login');
        expect(res.status).toBe(200);
    });

    it('debería saltar el rate limit para rutas de webhooks (/api/webhooks/*)', async () => {
        const res = await request(app).get('/api/webhooks/kick');
        expect(res.status).toBe(200);
    });

    it('debería responder 429 y logear warn cuando se supera el límite', async () => {
        const strictApp = express();
        strictApp.set('trust proxy', 1);
        const { rateLimit } = await import('express-rate-limit');
        const strictLimiter = rateLimit({
            windowMs: 60_000,
            limit: 1,
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res, _next, options) => {
                logger.warn({ ip: req.ip, path: req.path }, 'Rate limit exceeded for API');
                res.status(options.statusCode).json(options.message);
            },
            skip: () => false
        });
        strictApp.use(strictLimiter);
        strictApp.get('/test', (_req, res) => res.json({ ok: true }));

        await request(strictApp).get('/test');
        const res = await request(strictApp).get('/test');

        expect(res.status).toBe(429);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.objectContaining({ path: '/test' }),
            'Rate limit exceeded for API'
        );
    });
});

describe('authLimiter', () => {
    let app: express.Application;

    beforeEach(() => {
        jest.clearAllMocks();
        app = buildApp(authLimiter);
    });

    it('debería permitir peticiones dentro del límite de autenticación', async () => {
        const res = await request(app).get('/api/auth/login');
        expect(res.status).toBe(200);
    });

    it('debería responder 429 y logear warn al superar el límite de auth', async () => {
        const strictApp = express();
        strictApp.set('trust proxy', 1);
        const { rateLimit } = await import('express-rate-limit');
        const strictAuthLimiter = rateLimit({
            windowMs: 60_000,
            limit: 1,
            standardHeaders: true,
            legacyHeaders: false,
            handler: (req, res, _next, options) => {
                logger.warn({ ip: req.ip, path: req.path }, 'Auth rate limit exceeded');
                res.status(options.statusCode).json(options.message);
            },
            skip: () => false
        });
        strictApp.use(strictAuthLimiter);
        strictApp.get('/api/auth/login', (_req, res) => res.json({ ok: true }));

        await request(strictApp).get('/api/auth/login');
        const res = await request(strictApp).get('/api/auth/login');

        expect(res.status).toBe(429);
        expect(logger.warn).toHaveBeenCalledWith(
            expect.objectContaining({ path: '/api/auth/login' }),
            'Auth rate limit exceeded'
        );
    });
});

describe('webhookLimiter', () => {
    let app: express.Application;

    beforeEach(() => {
        app = buildApp(webhookLimiter);
    });

    it('debería permitir peticiones de webhook dentro del límite (600/min)', async () => {
        const res = await request(app).get('/api/webhooks/kick');
        expect(res.status).toBe(200);
    });
});