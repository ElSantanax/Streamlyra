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

    describe('branches adicionales de emit', () => {
        it('debería emitir si io.sockets.adapter.rooms no existe (sin verificación de room)', () => {
            const ioSinRooms = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
                sockets: {
                    adapter: {
                        rooms: undefined
                    }
                }
            } as unknown as Server;

            const result = SafeSocketEmitter.emit(ioSinRooms, { userId: 'u1', event: 'e', data: { ok: true } });

            expect(result).toBe(true);
            expect(ioSinRooms.to).toHaveBeenCalledWith('u1');
        });

        it('debería emitir si io.sockets.adapter es undefined', () => {
            const ioSinAdapter = {
                to: jest.fn().mockReturnThis(),
                emit: jest.fn(),
                sockets: {}
            } as unknown as Server;

            const result = SafeSocketEmitter.emit(ioSinAdapter, { userId: 'u1', event: 'e', data: 42 });

            expect(result).toBe(true);
        });
    });

    describe('branches adicionales de emitViewersUpdate y emitConnectionStatus', () => {
        beforeEach(() => {
            (mockIo.sockets.adapter.rooms as Map<string, Set<string>>).set('u1', new Set(['s1']));
        });

        it('emitViewersUpdate sin isLive usa el valor actual de isPlatformLive', () => {
            (mockSessionManager.isPlatformLive as jest.Mock).mockReturnValue(false);

            SafeSocketEmitter.emitViewersUpdate(mockIo, 'u1', 'kick', 50);
            expect(mockSessionManager.updateLiveStatus).toHaveBeenCalledWith('u1', 'kick', false);
            expect(mockIo.emit).toHaveBeenCalledWith('viewers_update', expect.objectContaining({
                platform: 'kick',
                count: 50,
                isLive: false
            }));
        });

        it('emitConnectionStatus sin isLive con status connected usa isPlatformLive', () => {
            (mockSessionManager.isPlatformLive as jest.Mock).mockReturnValue(true);

            SafeSocketEmitter.emitConnectionStatus(mockIo, 'u1', 'youtube', 'connected', 'Conectado');
            expect(mockIo.emit).toHaveBeenCalledWith('connection_status', expect.objectContaining({
                status: 'connected',
                isLive: true
            }));
        });

        it('emitConnectionStatus sin isLive con status connecting no activa isLive', () => {
            (mockSessionManager.isPlatformLive as jest.Mock).mockReturnValue(false);

            SafeSocketEmitter.emitConnectionStatus(mockIo, 'u1', 'twitch', 'connecting', 'Conectando...');
            expect(mockIo.emit).toHaveBeenCalledWith('connection_status', expect.objectContaining({
                status: 'connecting',
                isLive: false
            }));
        });
    });

    describe('emitChatMessage branches adicionales', () => {
        it('debería emitir si el mensaje es de owner pero no fue enviado desde dashboard', () => {
            (sentMessageCache.wasSentFromDashboard as jest.Mock).mockReturnValue(false);

            const message = { isOwner: true, message: 'nuevo mensaje' };
            const result = SafeSocketEmitter.emitChatMessage(mockIo, 'u1', message);

            expect(result).toBe(true);
            expect(mockIo.emit).toHaveBeenCalledWith('chat_message', message);
        });

        it('debería emitir si el mensaje no tiene propiedad message (no-string)', () => {
            const message = { isOwner: true, message: 123 }; // message no es string
            const result = SafeSocketEmitter.emitChatMessage(mockIo, 'u1', message);

            expect(result).toBe(true);
            expect(sentMessageCache.wasSentFromDashboard).not.toHaveBeenCalled();
        });

        it('debería emitir si se pasa null como mensaje', () => {
            const result = SafeSocketEmitter.emitChatMessage(mockIo, 'u1', null);
            expect(result).toBe(true);
            expect(mockIo.emit).toHaveBeenCalledWith('chat_message', null);
        });
    });
});
