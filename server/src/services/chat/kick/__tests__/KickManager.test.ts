import { Server } from 'socket.io';
import { KickManager } from '../KickManager';
import { KickService } from '../../../platforms/KickService';
import { KickWebhook } from '../../../../models/KickWebhook.model';
import { PollingManager } from '../../shared/PollingManager';
import { SafeSocketEmitter } from '../../../../utils/SafeSocketEmitter';
import { logger } from '../../../../utils/logger';
import { config } from '../../../../config';


jest.mock('../../../platforms/KickService');
jest.mock('../../../../models/KickWebhook.model');
jest.mock('../../shared/PollingManager');
jest.mock('../../../../utils/SafeSocketEmitter');
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
        appUrl: 'https://test.com'
    }
}));
jest.mock('../../../../config/kick.polling.config', () => ({
    KickPollingConfig: { VIEWER_POLLING_INTERVAL_MS: 30000 }
}));

describe('KickManager', () => {
    let manager: KickManager;
    let mockIo: jest.Mocked<Server>;
    let mockPollerInstance: {
        start: jest.Mock;
        stop: jest.Mock;
        isRunning: jest.Mock;
    };

    beforeEach(() => {
        // Obtenemos la instancia mockeada de PollingManager
        // y le inyectamos spies sobre sus métodos para verificar el poller interno
        mockPollerInstance = {
            start: jest.fn(),
            stop: jest.fn(),
            isRunning: jest.fn()
        };
        (PollingManager as jest.Mock).mockImplementation(() => mockPollerInstance);

        manager = new KickManager();
        mockIo = {} as unknown as jest.Mocked<Server>;

        Object.defineProperty(config, 'appUrl', { value: 'https://test.com', writable: true });
        jest.clearAllMocks();
    });

    describe('getChannelInfo', () => {
        const accessToken = 'token_abc';
        const userId = 'user_abc';

        it('debe solicitar canales y emitir estado al socket exitosamente', async () => {
            const mockChannels = [{
                broadcaster_user_id: 1234,
                slug: 'testchannel',
                stream: { viewer_count: 50, is_live: true }
            }];
            (KickService.getChannels as jest.Mock).mockResolvedValue(mockChannels);

            const result = await manager.getChannelInfo(accessToken, userId, mockIo);

            expect(result).toStrictEqual({
                broadcasterId: '1234',
                slug: 'testchannel',
                viewerCount: 50,
                isLive: true
            });
            expect(SafeSocketEmitter.emitViewersUpdate).toHaveBeenCalledWith(mockIo, userId, 'kick', 50, true);
        });

        it('debe devolver null si el getChannels devuelve vacío', async () => {
            (KickService.getChannels as jest.Mock).mockResolvedValue([]);
            const result = await manager.getChannelInfo(accessToken, userId, mockIo);
            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalledWith({}, 'No Kick channel found');
        });

        it('debe manejar canales sin broadcaster id', async () => {
            (KickService.getChannels as jest.Mock).mockResolvedValue([{ broadcaster_user_id: null }]);
            const result = await manager.getChannelInfo(accessToken, userId, mockIo);
            expect(result).toBeNull();
        });

        it('debe retornar isLive falso si no tiene stream y viewCount nulo', async () => {
            const mockChannels = [{
                broadcaster_user_id: 1234,
                slug: 'testchannel',
                stream: null // Simulamos offline completo
            }];
            (KickService.getChannels as jest.Mock).mockResolvedValue(mockChannels);

            const result = await manager.getChannelInfo(accessToken, userId, mockIo);

            expect(result).toStrictEqual({
                broadcasterId: '1234',
                slug: 'testchannel',
                viewerCount: 0,
                isLive: false
            });
        });

        it('debe atrapar errores de la API externa', async () => {
            (KickService.getChannels as jest.Mock).mockRejectedValue(new Error('Network error Kick'));
            const result = await manager.getChannelInfo(accessToken);
            expect(result).toBeNull();
            expect(logger.error).toHaveBeenCalledWith(expect.any(Object), 'Error getting Kick channel info');
        });
    });

    describe('Polling control', () => {
        const userId = 'user_poll';

        it('startViewerPolling debe iniciar el poller con el ciclo interno evaluando getChannelInfo', () => {
            const spyOnGetChannelInfo = jest.spyOn(manager, 'getChannelInfo').mockResolvedValue(null);

            manager.startViewerPolling(userId, 'token', mockIo);

            expect(mockPollerInstance.start).toHaveBeenCalledWith(userId, expect.any(Function), 30000);

            // Extraemos y ejecutamos el callback del poller para que cubra su try/catch interno
            const pollerCallback = mockPollerInstance.start.mock.calls[0][1];
            pollerCallback();

            expect(spyOnGetChannelInfo).toHaveBeenCalledWith('token', userId, mockIo);
        });

        it('stopViewerPolling detiene el polling', () => {
            manager.stopViewerPolling(userId);
            expect(mockPollerInstance.stop).toHaveBeenCalledWith(userId);

            manager.isPolling(userId);
            expect(mockPollerInstance.isRunning).toHaveBeenCalledWith(userId);
        });
    });

    describe('registerWebhook', () => {
        const userId = 'u1';
        const accessToken = 'tok1';
        const broadcasterId = 'b123';

        it('debe omitir la suscripción si la URL no es HTTPS', async () => {
            Object.defineProperty(config, 'appUrl', { value: 'http://test.com', writable: true });
            await manager.registerWebhook(userId, accessToken, broadcasterId);

            expect(logger.warn).toHaveBeenCalledWith(
                expect.objectContaining({ broadcasterId }),
                'Kick Webhooks: APP_URL no es HTTPS, suscripción omitida'
            );
        });

        it('debe omitir si el webhook ya está activo con la URL correcta en base de datos', async () => {
            (KickWebhook.findOne as jest.Mock).mockResolvedValue({
                isActive: true,
                callbackUrl: 'https://test.com/api/webhooks/kick'
            });

            await manager.registerWebhook(userId, accessToken, broadcasterId);

            expect(KickService.subscribeToWebhook).not.toHaveBeenCalled();
            expect(logger.debug).toHaveBeenCalledWith(
                expect.any(Object),
                'Kick Webhooks: Webhook ya está activo y con la URL correcta'
            );
        });

        it('debe actualizar si ya existe un registro pero esta inactivo o con URL diferente', async () => {
            const mockUpdate = jest.fn();
            (KickWebhook.findOne as jest.Mock).mockResolvedValue({
                isActive: false,
                callbackUrl: 'https://viejo.com',
                update: mockUpdate
            });

            await manager.registerWebhook(userId, accessToken, broadcasterId);

            expect(KickService.subscribeToWebhook).toHaveBeenCalledWith(accessToken, broadcasterId, 'https://test.com/api/webhooks/kick');
            expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({
                callbackUrl: 'https://test.com/api/webhooks/kick',
                isActive: true
            }));
            expect(logger.info).toHaveBeenCalledWith(expect.any(Object), 'Kick Webhooks: Webhook existente actualizado y reactivado');
        });

        it('debe crear uno nuevo si no hay previo', async () => {
            (KickWebhook.findOne as jest.Mock).mockResolvedValue(null);

            await manager.registerWebhook(userId, accessToken, broadcasterId);

            expect(KickService.subscribeToWebhook).toHaveBeenCalled();
            expect(KickWebhook.create).toHaveBeenCalledWith(
                expect.objectContaining({ userId, broadcasterId, isActive: true })
            );
        });

        it('debe manejar errores críticos atrapandolos', async () => {
            (KickWebhook.findOne as jest.Mock).mockRejectedValue(new Error('DB Failed on Webhook Find'));
            await manager.registerWebhook(userId, accessToken, broadcasterId);
            expect(logger.error).toHaveBeenCalledWith(expect.any(Object), 'Kick Webhooks: Error crítico durante el registro');
        });
    });

    describe('deactivateWebhook', () => {
        const broadcasterId = 'bdct_1';

        it('debe marcarlo como inactivo en la base de datos', async () => {
            (KickWebhook.update as jest.Mock).mockResolvedValue([1]); // rows updated

            await manager.deactivateWebhook(broadcasterId);

            expect(KickWebhook.update).toHaveBeenCalledWith(
                expect.objectContaining({ isActive: false }),
                expect.objectContaining({ where: { broadcasterId, isActive: true } })
            );
            expect(logger.info).toHaveBeenCalledWith({ broadcasterId }, 'Webhook de Kick marcado como inactivo');
        });

        it('debe atrapar fallos la desactivacion', async () => {
            (KickWebhook.update as jest.Mock).mockRejectedValue(new Error('Update error'));
            await manager.deactivateWebhook(broadcasterId);
            expect(logger.error).toHaveBeenCalledWith(expect.any(Object), 'Error desactivando webhook de Kick');
        });
    });

});
