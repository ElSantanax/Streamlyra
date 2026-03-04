import { TwitchManager } from '../TwitchManager';
import { TwitchEventSubClient } from '../../../platforms/TwitchEventSubClient';
import { TwitchWebhook } from '../../../../models/TwitchWebhook.model';
import { config } from '../../../../config';
import { encryptionService } from '../../../security/EncryptionService';
import { logger } from '../../../../utils/logger';

jest.mock('../../../platforms/TwitchEventSubClient');
jest.mock('../../../../models/TwitchWebhook.model');
jest.mock('../../../security/EncryptionService');
jest.mock('../../../../utils/logger', () => ({
    logger: {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
    }
}));
jest.mock('../../../../config', () => ({
    config: {
        appUrl: 'https://test.com',
        encryptionKey: '12345678901234567890123456789012' // 32 chars hex simulado
    }
}));

describe('TwitchManager', () => {
    let twitchManager: TwitchManager;

    beforeEach(() => {
        twitchManager = new TwitchManager();
        Object.defineProperty(config, 'appUrl', { value: 'https://test.com', writable: true });
        jest.clearAllMocks();
    });

    describe('registerWebhooks', () => {
        const userId = 'user123';
        const broadcasterId = 'broadcaster123';

        it('debe ignorar si la URL no es HTTPS', async () => {
            Object.defineProperty(config, 'appUrl', { value: 'http://test.com', writable: true });
            await twitchManager.registerWebhooks(userId, broadcasterId);
            expect(logger.warn).toHaveBeenCalledWith(
                expect.any(Object),
                'Twitch Webhooks: APP_URL no es HTTPS, suscripción omitida'
            );
            expect(TwitchWebhook.findOne).not.toHaveBeenCalled();
        });

        it('debe registrar suscripciones si no existen', async () => {
            (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(null);
            (encryptionService.encrypt as jest.Mock).mockReturnValue('encrypted-secret');
            (TwitchEventSubClient.subscribe as jest.Mock).mockResolvedValue({
                data: [{ id: 'new-sub-123' }]
            });

            await twitchManager.registerWebhooks(userId, broadcasterId);

            expect(TwitchEventSubClient.subscribe).toHaveBeenCalledTimes(7); // 7 EVENT_TYPES
            expect(TwitchWebhook.create).toHaveBeenCalledTimes(7);
            expect(logger.info).toHaveBeenCalledWith(
                expect.any(Object),
                'Twitch Webhooks: Nueva suscripción creada (pendiente de verificación)'
            );
        });

        it('no debe hacer nada si la suscripción ya está habilitada', async () => {
            (TwitchWebhook.findOne as jest.Mock).mockResolvedValue({
                status: 'enabled',
                callbackUrl: 'https://test.com/api/webhooks/twitch',
                secret: 'secret'
            });

            await twitchManager.registerWebhooks(userId, broadcasterId);

            expect(TwitchEventSubClient.subscribe).not.toHaveBeenCalled();
            expect(logger.debug).toHaveBeenCalledWith(
                expect.any(Object),
                'Twitch Webhooks: Suscripción ya activa'
            );
        });

        it('debe actualizar si la suscripción existe pero no está habilitada o la url cambia', async () => {
            const updateMock = jest.fn();
            (TwitchWebhook.findOne as jest.Mock).mockResolvedValue({
                status: 'revoked',
                callbackUrl: 'https://old.com',
                secret: 'secret',
                update: updateMock
            });
            (encryptionService.encrypt as jest.Mock).mockReturnValue('encrypted-secret');
            (TwitchEventSubClient.subscribe as jest.Mock).mockResolvedValue({
                data: [{ id: 'existing-sub-update' }]
            });

            await twitchManager.registerWebhooks(userId, broadcasterId);

            expect(updateMock).toHaveBeenCalledTimes(7);
            expect(TwitchEventSubClient.subscribe).toHaveBeenCalledTimes(7);
            expect(logger.info).toHaveBeenCalledWith(
                expect.any(Object),
                'Twitch Webhooks: Suscripción actualizada (pendiente de verificación)'
            );
        });

        it('debe manejar conflictos (409) limpiando y resincronizando', async () => {
            (TwitchWebhook.findOne as jest.Mock).mockResolvedValue(null);

            // Falla la primera vez con 409
            let subscribeCalls = 0;
            (TwitchEventSubClient.subscribe as jest.Mock).mockImplementation(() => {
                subscribeCalls++;
                if (subscribeCalls <= 7) {
                    const error = new Error('Conflict');
                    (error as unknown as { response: { status: number } }).response = { status: 409 };
                    throw error;
                }
                return Promise.resolve({ data: [{ id: 'fixed-sub' }] });
            });

            (TwitchEventSubClient.listSubscriptions as jest.Mock).mockResolvedValue([
                { id: 'conflict-sub-1', type: 'channel.follow', condition: { broadcaster_user_id: broadcasterId }, status: 'enabled' },
                { id: 'conflict-sub-2', type: 'channel.subscribe', condition: { broadcaster_user_id: broadcasterId }, status: 'enabled' },
                // simulamos 2 conflictos para ver que los resuelve
            ]);

            (TwitchEventSubClient.deleteSubscription as jest.Mock).mockResolvedValue(undefined);

            await twitchManager.registerWebhooks(userId, broadcasterId);

            expect(logger.warn).toHaveBeenCalledWith(
                expect.any(Object),
                'Twitch Webhooks: Conflicto 409 detectado. Intentando limpiar y resincronizar...'
            );
            expect(TwitchEventSubClient.deleteSubscription).toHaveBeenCalled();
            expect(TwitchEventSubClient.subscribe).toHaveBeenCalledTimes(14); // 7 fallos + 7 reintentos
            expect(TwitchWebhook.create).toHaveBeenCalledTimes(7);
        }, 35000); // 7 retries con 3 segundos de wait cada uno = ~21 segundos

        it('debe capturar y registrar el array de errores general', async () => {
            (TwitchWebhook.findOne as jest.Mock).mockRejectedValue(new Error('DB Query Failed'));
            await twitchManager.registerWebhooks(userId, broadcasterId);
            expect(logger.error).toHaveBeenCalledWith(
                expect.any(Object),
                'Error en ensureSubscription de Twitch'
            );
        });
    });

    describe('deleteAllSubscriptions', () => {
        const broadcasterId = 'broadcaster123';

        it('debe borrar todas las suscripciones en API y en BD', async () => {
            (TwitchWebhook.findAll as jest.Mock).mockResolvedValue([
                { subscriptionId: 'sub1' },
                { subscriptionId: 'sub2' },
                { subscriptionId: null } // No intenta borrar en Twitch si es null
            ]);
            (TwitchEventSubClient.deleteSubscription as jest.Mock).mockResolvedValue(undefined);

            await twitchManager.deleteAllSubscriptions(broadcasterId);

            expect(TwitchWebhook.findAll).toHaveBeenCalledWith({ where: { broadcasterId } });
            expect(TwitchEventSubClient.deleteSubscription).toHaveBeenCalledTimes(2);
            expect(TwitchEventSubClient.deleteSubscription).toHaveBeenCalledWith('sub1');
            expect(TwitchEventSubClient.deleteSubscription).toHaveBeenCalledWith('sub2');
            expect(TwitchWebhook.destroy).toHaveBeenCalledWith({ where: { broadcasterId } });
            expect(logger.info).toHaveBeenCalledWith(
                { broadcasterId },
                'Twitch Webhooks: Limpieza profunda completada'
            );
        });

        it('debe manejar errores logueándolos constructivamente', async () => {
            (TwitchWebhook.findAll as jest.Mock).mockRejectedValue(new Error('Fatal DB'));
            await twitchManager.deleteAllSubscriptions(broadcasterId);
            expect(logger.error).toHaveBeenCalledWith(
                expect.any(Object),
                'Twitch Webhooks: Error durante el borrado masivo'
            );
        });
    });

    describe('syncSubscriptionsOnStartup', () => {
        it('debe ignorar si la URL no es HTTPS', async () => {
            Object.defineProperty(config, 'appUrl', { value: 'http://test.com', writable: true });
            await twitchManager.syncSubscriptionsOnStartup();
            expect(logger.warn).toHaveBeenCalledWith('Twitch Sync: APP_URL no es HTTPS, omitiendo sincronización.');
        });

        it('debe procesar suscripciones e identificar cambios, huérfanos y URLs obsoletas', async () => {
            // Setup listSubscriptions:
            (TwitchEventSubClient.listSubscriptions as jest.Mock).mockResolvedValue([
                // 1) Huérfana (no está en BD)
                { id: 'sub-orphan', type: 'channel.follow', status: 'enabled' },
                // 2) Con URL obsoleta
                { id: 'sub-obsolete', type: 'channel.raid', status: 'enabled', transport: { callback: 'https://old.com/api' } },
                // 3) Con status mismatch
                { id: 'sub-mismatch', type: 'channel.subscribe', status: 'enabled', transport: { callback: 'https://test.com/api/webhooks/twitch' } },
                // 4) OK
                { id: 'sub-ok', type: 'stream.online', status: 'enabled', transport: { callback: 'https://test.com/api/webhooks/twitch' } }
            ]);

            const obsoleteUpdateMock = jest.fn();
            const mismatchUpdateMock = jest.fn();

            (TwitchWebhook.findAll as jest.Mock).mockResolvedValue([
                { subscriptionId: 'sub-obsolete', status: 'enabled', update: obsoleteUpdateMock },
                { subscriptionId: 'sub-mismatch', status: 'verification_pending', update: mismatchUpdateMock },
                { subscriptionId: 'sub-ok', status: 'enabled' }
            ]);

            await twitchManager.syncSubscriptionsOnStartup();

            // 1) Debe borrar la huérfana
            expect(TwitchEventSubClient.deleteSubscription).toHaveBeenCalledWith('sub-orphan');
            // 2) Debe borrar la obsoleta y actualizar a revoked
            expect(TwitchEventSubClient.deleteSubscription).toHaveBeenCalledWith('sub-obsolete');
            expect(obsoleteUpdateMock).toHaveBeenCalledWith({ status: 'revoked' });
            // 3) Debe actualizar status del mismatch
            expect(mismatchUpdateMock).toHaveBeenCalledWith({ status: 'enabled' });

            // 4) No toca la ok

            expect(logger.info).toHaveBeenCalledWith(
                expect.objectContaining({ valid: 2, deleted: 2 }), // valid: mismatch y ok. deleted: errphan, obsolete.
                'Twitch Sync: Sincronización completada.'
            );
        });

        it('debe atrapar errores críticos', async () => {
            (TwitchEventSubClient.listSubscriptions as jest.Mock).mockRejectedValue(new Error('API Down'));
            await twitchManager.syncSubscriptionsOnStartup();
            expect(logger.error).toHaveBeenCalledWith(
                expect.any(Object),
                'Twitch Sync: Error durante la sincronización inicial'
            );
        });
    });
});
