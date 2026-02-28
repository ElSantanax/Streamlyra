import * as routes from '../index';

describe('Routes Index', () => {
    it('debe exportar createAuthRoutes', () => {
        expect(routes.createAuthRoutes).toBeDefined();
        expect(typeof routes.createAuthRoutes).toBe('function');
    });

    it('debe exportar createWebhookRoutes', () => {
        expect(routes.createWebhookRoutes).toBeDefined();
        expect(typeof routes.createWebhookRoutes).toBe('function');
    });

    it('debe exportar authRoutes como default', () => {
        expect(routes.authRoutes).toBeDefined();
        expect(typeof routes.authRoutes).toBe('function');
    });

    it('debe exportar webhookRoutes como default', () => {
        expect(routes.webhookRoutes).toBeDefined();
        expect(typeof routes.webhookRoutes).toBe('function');
    });
});
