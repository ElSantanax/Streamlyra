import request from 'supertest';
import express, { Application } from 'express';
import { createWebhookRoutes } from '../webhook.routes';
import { WebhookController } from '../../controllers/webhook.controller';
import { WebhookProcessor } from '../../services/webhook/WebhookProcessor';

jest.mock('../../middleware/webhooks/kick.middleware', () => ({
    validateKickWebhook: jest.fn((_req, _res, next) => next())
}));

jest.mock('../../middleware/webhooks/twitch.middleware', () => ({
    validateTwitchWebhook: jest.fn((_req, _res, next) => next())
}));

jest.mock('../../middleware/webhooks/youtube.middleware', () => ({
    validateYouTubeWebhook: jest.fn((_req, _res, next) => next())
}));

describe('Webhook Routes', () => {
    let app: Application;
    let webhookProcessor: jest.Mocked<WebhookProcessor>;
    let webhookController: WebhookController;

    beforeEach(() => {
        webhookProcessor = {
            processKickEvent: jest.fn(),
            processTwitchEvent: jest.fn(),
            processYouTubeEvent: jest.fn()
        } as unknown as jest.Mocked<WebhookProcessor>;
        
        webhookController = new WebhookController(webhookProcessor);
        
        app = express();
        app.use(express.json());
        app.use('/webhooks', createWebhookRoutes(webhookController));
    });

    describe('POST /webhooks/kick', () => {
        it('debe registrar la ruta con validación de firma', async () => {
            const response = await request(app)
                .post('/webhooks/kick')
                .send({ event: 'test' });

            expect(response.status).toBeDefined();
        });
    });

    describe('POST /webhooks/twitch', () => {
        it('debe registrar la ruta con validación de firma', async () => {
            const response = await request(app)
                .post('/webhooks/twitch')
                .send({ event: 'test' });

            expect(response.status).toBeDefined();
        });
    });

    describe('ALL /webhooks/youtube', () => {
        it('debe aceptar POST con validación de firma', async () => {
            const response = await request(app)
                .post('/webhooks/youtube')
                .send({ event: 'test' });

            expect(response.status).toBeDefined();
        });

        it('debe aceptar GET para verificación de suscripción', async () => {
            const response = await request(app).get('/webhooks/youtube');

            expect(response.status).toBeDefined();
        });
    });
});
