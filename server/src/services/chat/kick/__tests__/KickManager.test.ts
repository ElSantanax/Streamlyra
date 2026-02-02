/**
 * Tests para KickManager
 * Verifica la lógica unificada de Canal, Espectadores y Webhooks
 */

// Mocks
jest.mock('../../../platforms/KickService');
jest.mock('../../../../models/KickWebhook.model');

import { Server } from 'socket.io';
import { KickManager } from '../KickManager';
import { KickService } from '../../../platforms/KickService';
import { KickWebhook } from '../../../../models/KickWebhook.model';

describe('KickManager', () => {
    let manager: KickManager;
    let mockIo: jest.Mocked<Server>;
    const userId = 'user-123';
    const accessToken = 'test-token';
    const broadcasterId = 'broadcaster-456';
    const originalAppUrl = process.env.APP_URL;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        manager = new KickManager();
        process.env.APP_URL = 'https://example.com';

        mockIo = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        } as unknown as jest.Mocked<Server>;
    });

    afterEach(() => {
        process.env.APP_URL = originalAppUrl;
        manager.stopViewerPolling(userId);
        jest.useRealTimers();
    });

    describe('getChannelInfo', () => {
        it('debe obtener info del canal y emitir actualización de viewers', async () => {
            const mockChannels = [{
                broadcaster_user_id: 456,
                slug: 'test-slug',
                stream: { viewer_count: 150 }
            }];
            (KickService.getChannels as jest.Mock).mockResolvedValue(mockChannels);

            const info = await manager.getChannelInfo(accessToken, userId, mockIo);

            expect(info).toEqual({
                broadcasterId: '456',
                slug: 'test-slug',
                viewerCount: 150
            });
            expect(mockIo.to).toHaveBeenCalledWith(userId);
            expect(mockIo.emit).toHaveBeenCalledWith('viewers_update', {
                platform: 'kick',
                count: 150
            });
        });

        it('debe manejar errores y retornar null', async () => {
            (KickService.getChannels as jest.Mock).mockRejectedValue(new Error('API Error'));
            const info = await manager.getChannelInfo(accessToken);
            expect(info).toBeNull();
        });
    });

    describe('Viewer Polling', () => {
        it('debe realizar polling cada 30 segundos', async () => {
            const mockChannels = [{
                broadcaster_user_id: 456,
                slug: 'test-slug',
                stream: { viewer_count: 100 }
            }];
            (KickService.getChannels as jest.Mock).mockResolvedValue(mockChannels);

            manager.startViewerPolling(userId, accessToken, mockIo);

            // Ejecutar el placeholder timeout y la primera ejecución inmediata
            await jest.advanceTimersByTimeAsync(0);
            expect(KickService.getChannels).toHaveBeenCalledTimes(1);

            // Segundo poll tras 30s
            await jest.advanceTimersByTimeAsync(30000);
            expect(KickService.getChannels).toHaveBeenCalledTimes(2);
        });
    });

    describe('Webhooks', () => {
        it('debe reutilizar webhook activo', async () => {
            (KickWebhook.findOne as jest.Mock).mockResolvedValue({ isActive: true });
            await manager.registerWebhook(userId, accessToken, broadcasterId);
            expect(KickService.subscribeToWebhook).not.toHaveBeenCalled();
        });

        it('debe reactivar webhook inactivo', async () => {
            const mockWebhook = { isActive: false, save: jest.fn() };
            (KickWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);

            await manager.registerWebhook(userId, accessToken, broadcasterId);

            expect(mockWebhook.isActive).toBe(true);
            expect(mockWebhook.save).toHaveBeenCalled();
            expect(KickService.subscribeToWebhook).not.toHaveBeenCalled();
        });

        it('debe crear nuevo webhook si no existe', async () => {
            (KickWebhook.findOne as jest.Mock).mockResolvedValue(null);

            await manager.registerWebhook(userId, accessToken, broadcasterId);

            expect(KickService.subscribeToWebhook).toHaveBeenCalled();
            expect(KickWebhook.create).toHaveBeenCalled();
        });
    });
});
