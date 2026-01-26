/**
 * Tests para KickViewerPoller
 * Verifica que el polling de espectadores use los headers correctos
 */

// Mock de KickService
jest.mock('../../../platforms/KickService');

import { Server } from 'socket.io';
import { KickViewerPoller } from '../KickViewerPoller';
import { KickService } from '../../../platforms/KickService';

describe('KickViewerPoller', () => {
    let poller: KickViewerPoller;
    let mockIo: jest.Mocked<Server>;
    const userId = 'test-user-123';
    const accessToken = 'test-access-token';

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useFakeTimers();
        
        poller = new KickViewerPoller();
        
        // Mock Socket.IO
        mockIo = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn()
        } as unknown as jest.Mocked<Server>;
    });

    afterEach(() => {
        poller.stopPolling(userId);
        jest.useRealTimers();
    });

    describe('startPolling', () => {
        it('debe usar KickService.getChannelByToken() con headers correctos', async () => {
            const mockChannels = [{
                broadcaster_user_id: 123,
                slug: 'test-channel',
                stream: {
                    is_live: true,
                    viewer_count: 100
                }
            }];

            (KickService.getChannelByToken as jest.Mock).mockResolvedValue(mockChannels);

            poller.startPolling(userId, accessToken, mockIo);

            // Avanzar tiempo para ejecutar el primer poll
            await jest.advanceTimersByTimeAsync(100);

            // Verificar que se llamó a KickService.getChannelByToken
            expect(KickService.getChannelByToken).toHaveBeenCalledWith(accessToken);
            expect(KickService.getChannelByToken).toHaveBeenCalledTimes(1);
        });

        it('debe emitir viewers_update con el conteo correcto', async () => {
            const mockChannels = [{
                broadcaster_user_id: 123,
                slug: 'test-channel',
                stream: {
                    is_live: true,
                    viewer_count: 250
                }
            }];

            (KickService.getChannelByToken as jest.Mock).mockResolvedValue(mockChannels);

            poller.startPolling(userId, accessToken, mockIo);
            await jest.advanceTimersByTimeAsync(100);

            expect(mockIo.to).toHaveBeenCalledWith(userId);
            expect(mockIo.emit).toHaveBeenCalledWith('viewers_update', {
                platform: 'kick',
                count: 250
            });
        });

        it('debe emitir 0 espectadores cuando stream es null', async () => {
            const mockChannels = [{
                broadcaster_user_id: 123,
                slug: 'test-channel',
                stream: null
            }];

            (KickService.getChannelByToken as jest.Mock).mockResolvedValue(mockChannels);

            poller.startPolling(userId, accessToken, mockIo);
            await jest.advanceTimersByTimeAsync(100);

            expect(mockIo.emit).toHaveBeenCalledWith('viewers_update', {
                platform: 'kick',
                count: 0
            });
        });

        it('debe emitir 0 espectadores cuando viewer_count es undefined', async () => {
            const mockChannels = [{
                broadcaster_user_id: 123,
                slug: 'test-channel',
                stream: {
                    is_live: true
                    // viewer_count no definido
                }
            }];

            (KickService.getChannelByToken as jest.Mock).mockResolvedValue(mockChannels);

            poller.startPolling(userId, accessToken, mockIo);
            await jest.advanceTimersByTimeAsync(100);

            expect(mockIo.emit).toHaveBeenCalledWith('viewers_update', {
                platform: 'kick',
                count: 0
            });
        });

        it('debe hacer polling cada 30 segundos', async () => {
            const mockChannels = [{
                broadcaster_user_id: 123,
                slug: 'test-channel',
                stream: { is_live: true, viewer_count: 100 }
            }];

            (KickService.getChannelByToken as jest.Mock).mockResolvedValue(mockChannels);

            poller.startPolling(userId, accessToken, mockIo);

            // Primer poll
            await jest.advanceTimersByTimeAsync(100);
            expect(KickService.getChannelByToken).toHaveBeenCalledTimes(1);

            // Segundo poll (30 segundos después)
            await jest.advanceTimersByTimeAsync(30000);
            expect(KickService.getChannelByToken).toHaveBeenCalledTimes(2);

            // Tercer poll (60 segundos después del inicio)
            await jest.advanceTimersByTimeAsync(30000);
            expect(KickService.getChannelByToken).toHaveBeenCalledTimes(3);
        });

        it('debe manejar errores sin crashear', async () => {
            const error = new Error('API Error');
            (KickService.getChannelByToken as jest.Mock).mockRejectedValue(error);

            poller.startPolling(userId, accessToken, mockIo);
            await jest.advanceTimersByTimeAsync(100);

            // No debe crashear, solo loggear el error
            expect(mockIo.emit).not.toHaveBeenCalled();
        });

        it('debe manejar respuesta vacía sin crashear', async () => {
            (KickService.getChannelByToken as jest.Mock).mockResolvedValue([]);

            poller.startPolling(userId, accessToken, mockIo);
            await jest.advanceTimersByTimeAsync(100);

            // No debe crashear ni emitir
            expect(mockIo.emit).not.toHaveBeenCalled();
        });

        it('debe manejar respuesta null sin crashear', async () => {
            (KickService.getChannelByToken as jest.Mock).mockResolvedValue(null);

            poller.startPolling(userId, accessToken, mockIo);
            await jest.advanceTimersByTimeAsync(100);

            // No debe crashear ni emitir
            expect(mockIo.emit).not.toHaveBeenCalled();
        });
    });

    describe('stopPolling', () => {
        it('debe detener el polling correctamente', async () => {
            const mockChannels = [{
                broadcaster_user_id: 123,
                slug: 'test-channel',
                stream: { is_live: true, viewer_count: 100 }
            }];

            (KickService.getChannelByToken as jest.Mock).mockResolvedValue(mockChannels);

            poller.startPolling(userId, accessToken, mockIo);
            await jest.advanceTimersByTimeAsync(100);
            
            expect(KickService.getChannelByToken).toHaveBeenCalledTimes(1);

            // Detener polling
            poller.stopPolling(userId);

            // Avanzar tiempo - no debe hacer más polls
            await jest.advanceTimersByTimeAsync(60000);
            expect(KickService.getChannelByToken).toHaveBeenCalledTimes(1); // Sigue siendo 1
        });

        it('debe poder reiniciar el polling después de detenerlo', async () => {
            const mockChannels = [{
                broadcaster_user_id: 123,
                slug: 'test-channel',
                stream: { is_live: true, viewer_count: 100 }
            }];

            (KickService.getChannelByToken as jest.Mock).mockResolvedValue(mockChannels);

            // Primer ciclo
            poller.startPolling(userId, accessToken, mockIo);
            await jest.advanceTimersByTimeAsync(100);
            poller.stopPolling(userId);

            // Segundo ciclo
            poller.startPolling(userId, accessToken, mockIo);
            await jest.advanceTimersByTimeAsync(100);

            expect(KickService.getChannelByToken).toHaveBeenCalledTimes(2);
        });
    });
});
