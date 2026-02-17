import express, { Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import { config } from './config';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/error.middleware';
import { setCsrfCookie, verifyCsrf } from './middleware/csrf.middleware';
import { apiLimiter, webhookLimiter } from './middleware/rateLimit.middleware';
import { createAuthRoutes } from './routes/auth.routes';
import { createWebhookRoutes } from './routes/webhook.routes';
import { AuthController } from './controllers/auth.controller';
import { WebhookController } from './controllers/webhook.controller';

interface RequestWithRawBody extends Request {
    rawBody?: string;
}

/**
 * Configura y retorna la aplicación Express.
 */
export function createApp(authController: AuthController, webhookController: WebhookController) {
    const app = express();

    app.set('trust proxy', 1);

    // Basic Middlewares
    app.use(cors({
        origin: config.frontendUrl,
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token']
    }));

    app.use(cookieParser());
    app.use(setCsrfCookie);
    app.use(verifyCsrf);

    // Logging
    app.use(pinoHttp({
        logger,
        serializers: {
            req(req) {
                const r = req as unknown as { id?: string; method?: string; url?: string };
                return {
                    id: r.id,
                    method: r.method,
                    url: r.url
                };
            },
            res(res) {
                const r = res as unknown as { statusCode?: number };
                return {
                    statusCode: r.statusCode
                };
            }
        }
    }));

    // Body Parsers & rawBody support
    const rawBodyBuffer = (req: RequestWithRawBody, _res: Response, buf: Buffer) => {
        if (buf && buf.length) req.rawBody = buf.toString();
    };

    app.use(express.json({ verify: rawBodyBuffer }));
    app.use(express.text({
        type: ['application/xml', 'application/atom+xml'],
        verify: rawBodyBuffer
    }));

    // Routes
    app.use('/api/', apiLimiter);
    app.use('/api/auth', createAuthRoutes(authController));
    app.use('/api/webhooks', webhookLimiter, createWebhookRoutes(webhookController));

    app.get('/api/status', (_req, res) => {
        res.json({ status: 'ok', message: 'API Online' });
    });

    app.get('/', (_req, res) => {
        res.send('Servidor funcionando');
    });

    // Error Handling
    app.use(errorHandler);

    return app;
}
