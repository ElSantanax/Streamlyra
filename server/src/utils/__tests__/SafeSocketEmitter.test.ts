import { SafeSocketEmitter } from '../SafeSocketEmitter';
import { Server } from 'socket.io';
import { logger } from '../logger';
import { StreamSessionManager } from '../../services/core/StreamSessionManager';
import { sentMessageCache } from '../SentMessageCache';

jest.mock('socket.io');
jest.mock('../logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    }
}));
jest.mock('../../config', () => ({
    config: { nodeEnv: 'development' }
}));
jest.mock('../../services/core/StreamSessionManager');
jest.mock('../SentMessageCache');

describe('SafeSocketEmitter', () => {
    let mockIo: jest.Mocked<Server>;
    let mockSessionManager: jest.Mocked<StreamSessionManager>;

    beforeEach(() => {
        jest.clearAllMocks();

        mockIo = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            sockets: {
                adapter: {
                    rooms: new Map()
                }
            }
        } as unknown as jest.Mocked<Server>;

        mockSessionManager = {
            isPlatformLive: jest.fn(),
            updateLiveStatus: jest.fn().mockReturnValue({ startTime: '2026-03-04T00:00:00Z' })
        } as unknown as jest.Mocked<StreamSessionManager>;

        (StreamSessionManager.getInstance as jest.Mock).mockReturnValue(mockSessionManager);
    });

    describe('emit', () => {
        it('debería validar parámetros básicos', () => {
            expect(SafeSocketEmitter.emit(mockIo, { userId: '', event: 'e', data: {} })).toBe(false);
            expect(SafeSocketEmitter.emit(mockIo, { userId: 'u1', event: '', data: {} })).toBe(false);
            expect(SafeSocketEmitter.emit(mockIo, { userId: 'u1', event: 'e', data: undefined })).toBe(false);
            expect(logger.warn).toHaveBeenCalledTimes(3);
        });

        it('debería retornar false si el usuario no tiene sockets activos', () => {
            // Room vacío o inexistente
            expect(SafeSocketEmitter.emit(mockIo, { userId: 'u1', event: 'e', data: {} })).toBe(false);
            expect(logger.debug).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('Usuario sin sockets activos'));
        });

        it('debería emitir si el usuario tiene sockets activos', () => {
            (mockIo.sockets.adapter.rooms as Map<string, Set<string>>).set('u1', new Set(['s1']));

            const result = SafeSocketEmitter.emit(mockIo, { userId: 'u1', event: 'e', data: { foo: 'bar' } });

            expect(result).toBe(true);
            expect(mockIo.to).toHaveBeenCalledWith('u1');
            expect(mockIo.emit).toHaveBeenCalledWith('e', { foo: 'bar' });
        });

        it('debería validar serialización en desarrollo', () => {
            (mockIo.sockets.adapter.rooms as Map<string, Set<string>>).set('u1', new Set(['s1']));

            // Objeto circular
            const circular: Record<string, unknown> = {};
            circular.self = circular;

            const result = SafeSocketEmitter.emit(mockIo, { userId: 'u1', event: 'e', data: circular });

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('Error de serialización'));
        });

        it('debería manejar errores inesperados', () => {
            (mockIo.sockets.adapter.rooms as Map<string, Set<string>>).set('u1', new Set(['s1']));
            mockIo.to.mockImplementation(() => { throw new Error('Crashear'); });

            const result = SafeSocketEmitter.emit(mockIo, { userId: 'u1', event: 'e', data: {} });

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(expect.anything(), expect.stringContaining('Error inesperado'));
        });
    });

    describe('emitChatMessage', () => {
        it('debería prevenir echo si el mensaje viene del dashboard', () => {
            (sentMessageCache.wasSentFromDashboard as jest.Mock).mockReturnValue(true);

            const message = { isOwner: true, message: 'hola' };
            const result = SafeSocketEmitter.emitChatMessage(mockIo, 'u1', message);

            expect(result).toBe(false);
            expect(mockIo.emit).not.toHaveBeenCalled();
        });

        it('debería emitir mensaje de chat normalmente', () => {
            (sentMessageCache.wasSentFromDashboard as jest.Mock).mockReturnValue(false);

            const message = { isOwner: false, message: 'hola' };
            const result = SafeSocketEmitter.emitChatMessage(mockIo, 'u1', message);

            expect(result).toBe(true);
            expect(mockIo.emit).toHaveBeenCalledWith('chat_message', message);
        });
    });

    describe('metodos especializados', () => {
        beforeEach(() => {
            (mockIo.sockets.adapter.rooms as Map<string, Set<string>>).set('u1', new Set(['s1']));
        });

        it('emitViewersUpdate', () => {
            SafeSocketEmitter.emitViewersUpdate(mockIo, 'u1', 'twitch', 100, true);
            expect(mockSessionManager.updateLiveStatus).toHaveBeenCalledWith('u1', 'twitch', true);
            expect(mockIo.emit).toHaveBeenCalledWith('viewers_update', expect.objectContaining({
                platform: 'twitch',
                count: 100,
                isLive: true
            }));
        });

        it('emitConnectionStatus', () => {
            SafeSocketEmitter.emitConnectionStatus(mockIo, 'u1', 'twitch', 'connected', 'OK', true);
            expect(mockIo.emit).toHaveBeenCalledWith('connection_status', expect.objectContaining({
                status: 'connected',
                isLive: true
            }));
        });

        it('emitConnectionStatus debería forzar isLive: false en desconexión', () => {
            SafeSocketEmitter.emitConnectionStatus(mockIo, 'u1', 'twitch', 'disconnected', 'Bye', true);
            expect(mockIo.emit).toHaveBeenCalledWith('connection_status', expect.objectContaining({
                status: 'disconnected',
                isLive: false
            }));
        });

        it('emitError', () => {
            SafeSocketEmitter.emitError(mockIo, 'u1', 'ERR_1', 'Fallo', 'twitch');
            expect(mockIo.emit).toHaveBeenCalledWith('error', { code: 'ERR_1', message: 'Fallo' });
        });

        it('emitLastFollowerUpdate', () => {
            const data = { name: 'f1', platform: 'twitch', at: new Date() };
            SafeSocketEmitter.emitLastFollowerUpdate(mockIo, 'u1', data);
            expect(mockIo.emit).toHaveBeenCalledWith('last_follower_update', data);
        });

        it('emitLastRaidUpdate', () => {
            const data = { name: 'r1', platform: 'twitch', viewers: 50, at: new Date() };
            SafeSocketEmitter.emitLastRaidUpdate(mockIo, 'u1', data);
            expect(mockIo.emit).toHaveBeenCalledWith('last_raid_update', data);
        });
    });
});
