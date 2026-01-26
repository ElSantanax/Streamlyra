/**
 * Tests para KickWebhookManager
 * Verifica el tracking de webhooks y prevención de duplicados
 */

// Mocks
jest.mock('../../../platforms/KickService');
jest.mock('../../../../models/KickWebhook.model');

import { KickWebhookManager } from '../KickWebhookManager';
import { KickService } from '../../../platforms/KickService';
import { KickWebhook } from '../../../../models/KickWebhook.model';

describe('KickWebhookManager', () => {
    let manager: KickWebhookManager;
    const userId = 'user-123';
    const accessToken = 'test-token';
    const broadcasterId = 'broadcaster-456';
    const originalAppUrl = process.env.APP_URL;

    beforeEach(() => {
        jest.clearAllMocks();
        manager = new KickWebhookManager();
        process.env.APP_URL = 'https://example.com';
    });

    afterEach(() => {
        process.env.APP_URL = originalAppUrl;
    });

    describe('registerWebhook', () => {
        it('debe crear un nuevo webhook si no existe uno activo', async () => {
            (KickWebhook.findOne as jest.Mock).mockResolvedValue(null);
            (KickService.subscribeToChat as jest.Mock).mockResolvedValue(undefined);
            (KickWebhook.create as jest.Mock).mockResolvedValue({});

            await manager.registerWebhook(userId, accessToken, broadcasterId);

            expect(KickWebhook.findOne).toHaveBeenCalledWith({
                where: {
                    broadcasterId,
                    isActive: true
                }
            });

            expect(KickService.subscribeToChat).toHaveBeenCalledWith(
                accessToken,
                broadcasterId,
                'https://example.com/api/webhooks/kick'
            );

            expect(KickWebhook.create).toHaveBeenCalledWith({
                userId,
                broadcasterId,
                callbackUrl: 'https://example.com/api/webhooks/kick',
                isActive: true,
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                registeredAt: expect.any(Date),
                lastEventAt: null,
                deactivatedAt: null
            });
        });

        it('debe reutilizar webhook existente si está activo', async () => {
            const existingWebhook = {
                id: 1,
                broadcasterId,
                isActive: true,
                registeredAt: new Date('2024-01-01')
            };

            (KickWebhook.findOne as jest.Mock).mockResolvedValue(existingWebhook);

            await manager.registerWebhook(userId, accessToken, broadcasterId);

            expect(KickWebhook.findOne).toHaveBeenCalled();
            expect(KickService.subscribeToChat).not.toHaveBeenCalled();
            expect(KickWebhook.create).not.toHaveBeenCalled();
        });

        it('debe crear nuevo webhook si el existente está inactivo', async () => {
            // Simular que existe un webhook inactivo
            const inactiveWebhook = {
                id: 1,
                broadcasterId,
                isActive: false,
                deactivatedAt: new Date(),
                registeredAt: new Date('2024-01-01'),
                save: jest.fn().mockResolvedValue(undefined)
            };

            (KickWebhook.findOne as jest.Mock)
                .mockResolvedValueOnce(null) // No encuentra activo
                .mockResolvedValueOnce(inactiveWebhook); // Encuentra inactivo

            await manager.registerWebhook(userId, accessToken, broadcasterId);

            // Debe REACTIVAR el webhook existente, no crear uno nuevo
            expect(KickService.subscribeToChat).not.toHaveBeenCalled();
            expect(KickWebhook.create).not.toHaveBeenCalled();
            expect(inactiveWebhook.save).toHaveBeenCalled();
            expect(inactiveWebhook.isActive).toBe(true);
            expect(inactiveWebhook.deactivatedAt).toBe(null);
        });

        it('debe crear nuevo webhook solo si no existe ninguno (ni activo ni inactivo)', async () => {
            (KickWebhook.findOne as jest.Mock)
                .mockResolvedValueOnce(null) // No encuentra activo
                .mockResolvedValueOnce(null); // No encuentra inactivo
            (KickService.subscribeToChat as jest.Mock).mockResolvedValue(undefined);
            (KickWebhook.create as jest.Mock).mockResolvedValue({});

            await manager.registerWebhook(userId, accessToken, broadcasterId);

            expect(KickService.subscribeToChat).toHaveBeenCalled();
            expect(KickWebhook.create).toHaveBeenCalled();
        });

        it('no debe registrar webhook si APP_URL no es HTTPS', async () => {
            process.env.APP_URL = 'http://example.com';

            await manager.registerWebhook(userId, accessToken, broadcasterId);

            expect(KickWebhook.findOne).not.toHaveBeenCalled();
            expect(KickService.subscribeToChat).not.toHaveBeenCalled();
            expect(KickWebhook.create).not.toHaveBeenCalled();
        });

        it('debe manejar errores sin crashear', async () => {
            (KickWebhook.findOne as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(
                manager.registerWebhook(userId, accessToken, broadcasterId)
            ).resolves.not.toThrow();
        });
    });

    describe('deactivateWebhook', () => {
        it('debe marcar webhook como inactivo', async () => {
            const mockWebhook = {
                id: 1,
                broadcasterId,
                isActive: true,
                deactivatedAt: null as Date | null,
                save: jest.fn().mockResolvedValue(undefined)
            };

            (KickWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);

            await manager.deactivateWebhook(broadcasterId);

            expect(KickWebhook.findOne).toHaveBeenCalledWith({
                where: {
                    broadcasterId,
                    isActive: true
                }
            });

            expect(mockWebhook.isActive).toBe(false);
            expect(mockWebhook.deactivatedAt).toBeInstanceOf(Date);
            expect(mockWebhook.save).toHaveBeenCalled();
        });

        it('no debe hacer nada si no encuentra webhook activo', async () => {
            (KickWebhook.findOne as jest.Mock).mockResolvedValue(null);

            await manager.deactivateWebhook(broadcasterId);

            expect(KickWebhook.findOne).toHaveBeenCalled();
            // No debe crashear
        });

        it('debe manejar errores sin crashear', async () => {
            (KickWebhook.findOne as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(
                manager.deactivateWebhook(broadcasterId)
            ).resolves.not.toThrow();
        });
    });

    describe('updateLastEvent', () => {
        it('debe actualizar lastEventAt del webhook activo', async () => {
            (KickWebhook.update as jest.Mock).mockResolvedValue([1]);

            await manager.updateLastEvent(broadcasterId);

            expect(KickWebhook.update).toHaveBeenCalledWith(
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                { lastEventAt: expect.any(Date) },
                {
                    where: {
                        broadcasterId,
                        isActive: true
                    }
                }
            );
        });

        it('debe manejar errores sin crashear', async () => {
            (KickWebhook.update as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(
                manager.updateLastEvent(broadcasterId)
            ).resolves.not.toThrow();
        });
    });
});
