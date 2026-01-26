/**
 * Tests para SafeSocketEmitter
 * Verifica el manejo de errores en emisiones de Socket.IO
 */

import { Server } from 'socket.io';
import { SafeSocketEmitter } from '../SafeSocketEmitter';

describe('SafeSocketEmitter', () => {
    let mockIo: jest.Mocked<Server>;
    let mockTo: jest.Mock;
    let mockEmit: jest.Mock;

    beforeEach(() => {
        // Mock de Socket.IO
        mockEmit = jest.fn();
        mockTo = jest.fn().mockReturnValue({ emit: mockEmit });
        
        mockIo = {
            to: mockTo,
            sockets: {
                adapter: {
                    rooms: new Map([
                        ['user-123', new Set(['socket-1', 'socket-2'])],
                        ['user-456', new Set(['socket-3'])]
                    ])
                }
            }
        } as unknown as jest.Mocked<Server>;
    });

    describe('emit', () => {
        test('debe emitir evento exitosamente con datos válidos', () => {
            const result = SafeSocketEmitter.emit(mockIo, {
                userId: 'user-123',
                event: 'chat_message',
                data: { message: 'Hello' },
                platform: 'twitch'
            });

            expect(result).toBe(true);
            expect(mockTo).toHaveBeenCalledWith('user-123');
            expect(mockEmit).toHaveBeenCalledWith('chat_message', { message: 'Hello' });
        });

        test('debe retornar false si userId es inválido', () => {
            const result = SafeSocketEmitter.emit(mockIo, {
                userId: '',
                event: 'chat_message',
                data: { message: 'Hello' },
                platform: 'twitch'
            });

            expect(result).toBe(false);
            expect(mockTo).not.toHaveBeenCalled();
            expect(mockEmit).not.toHaveBeenCalled();
        });

        test('debe retornar false si userId no es string', () => {
            const result = SafeSocketEmitter.emit(mockIo, {
                userId: null as unknown as string,
                event: 'chat_message',
                data: { message: 'Hello' },
                platform: 'twitch'
            });

            expect(result).toBe(false);
            expect(mockTo).not.toHaveBeenCalled();
        });

        test('debe retornar false si event es inválido', () => {
            const result = SafeSocketEmitter.emit(mockIo, {
                userId: 'user-123',
                event: '',
                data: { message: 'Hello' },
                platform: 'twitch'
            });

            expect(result).toBe(false);
            expect(mockTo).not.toHaveBeenCalled();
        });

        test('debe retornar false si data es undefined', () => {
            const result = SafeSocketEmitter.emit(mockIo, {
                userId: 'user-123',
                event: 'chat_message',
                data: undefined,
                platform: 'twitch'
            });

            expect(result).toBe(false);
            expect(mockTo).not.toHaveBeenCalled();
        });

        test('debe permitir data null', () => {
            const result = SafeSocketEmitter.emit(mockIo, {
                userId: 'user-123',
                event: 'chat_message',
                data: null,
                platform: 'twitch'
            });

            expect(result).toBe(true);
            expect(mockTo).toHaveBeenCalledWith('user-123');
            expect(mockEmit).toHaveBeenCalledWith('chat_message', null);
        });

        test('debe retornar false si usuario no tiene sockets conectados', () => {
            const result = SafeSocketEmitter.emit(mockIo, {
                userId: 'user-999',
                event: 'chat_message',
                data: { message: 'Hello' },
                platform: 'twitch'
            });

            expect(result).toBe(false);
            expect(mockTo).not.toHaveBeenCalled();
        });

        test('debe detectar referencias circulares', () => {
            // Crear objeto con referencia circular
            const circularObj: { name: string; self?: unknown } = { name: 'test' };
            circularObj.self = circularObj;

            const result = SafeSocketEmitter.emit(mockIo, {
                userId: 'user-123',
                event: 'chat_message',
                data: circularObj,
                platform: 'twitch'
            });

            expect(result).toBe(false);
            expect(mockTo).not.toHaveBeenCalled();
        });

        test('debe funcionar sin adapter (modo test)', () => {
            // Mock sin adapter (como en algunos tests)
            const mockIoNoAdapter = {
                to: mockTo,
                sockets: {}
            } as unknown as jest.Mocked<Server>;

            const result = SafeSocketEmitter.emit(mockIoNoAdapter, {
                userId: 'user-123',
                event: 'chat_message',
                data: { message: 'Hello' },
                platform: 'twitch'
            });

            expect(result).toBe(true);
            expect(mockTo).toHaveBeenCalledWith('user-123');
            expect(mockEmit).toHaveBeenCalledWith('chat_message', { message: 'Hello' });
        });

        test('debe manejar errores inesperados', () => {
            // Forzar un error en to()
            mockTo.mockImplementation(() => {
                throw new Error('Socket error');
            });

            const result = SafeSocketEmitter.emit(mockIo, {
                userId: 'user-123',
                event: 'chat_message',
                data: { message: 'Hello' },
                platform: 'twitch'
            });

            expect(result).toBe(false);
        });
    });

    describe('emitChatMessage', () => {
        test('debe emitir mensaje de chat correctamente', () => {
            const message = { text: 'Hello', username: 'user1' };
            const result = SafeSocketEmitter.emitChatMessage(
                mockIo,
                'user-123',
                message,
                'twitch'
            );

            expect(result).toBe(true);
            expect(mockTo).toHaveBeenCalledWith('user-123');
            expect(mockEmit).toHaveBeenCalledWith('chat_message', message);
        });

        test('debe retornar false con datos inválidos', () => {
            const result = SafeSocketEmitter.emitChatMessage(
                mockIo,
                '',
                { text: 'Hello' },
                'twitch'
            );

            expect(result).toBe(false);
            expect(mockTo).not.toHaveBeenCalled();
        });
    });

    describe('emitViewersUpdate', () => {
        test('debe emitir actualización de viewers correctamente', () => {
            const result = SafeSocketEmitter.emitViewersUpdate(
                mockIo,
                'user-123',
                'youtube',
                1500
            );

            expect(result).toBe(true);
            expect(mockTo).toHaveBeenCalledWith('user-123');
            expect(mockEmit).toHaveBeenCalledWith('viewers_update', {
                platform: 'youtube',
                count: 1500
            });
        });

        test('debe permitir count 0', () => {
            const result = SafeSocketEmitter.emitViewersUpdate(
                mockIo,
                'user-123',
                'twitch',
                0
            );

            expect(result).toBe(true);
            expect(mockEmit).toHaveBeenCalledWith('viewers_update', {
                platform: 'twitch',
                count: 0
            });
        });
    });

    describe('emitConnectionStatus', () => {
        test('debe emitir estado de conexión correctamente', () => {
            const result = SafeSocketEmitter.emitConnectionStatus(
                mockIo,
                'user-123',
                'kick',
                'connected'
            );

            expect(result).toBe(true);
            expect(mockTo).toHaveBeenCalledWith('user-123');
            expect(mockEmit).toHaveBeenCalledWith('connection_status', {
                platform: 'kick',
                status: 'connected',
                message: undefined
            });
        });

        test('debe incluir mensaje opcional', () => {
            const result = SafeSocketEmitter.emitConnectionStatus(
                mockIo,
                'user-123',
                'kick',
                'error',
                'Token inválido'
            );

            expect(result).toBe(true);
            expect(mockEmit).toHaveBeenCalledWith('connection_status', {
                platform: 'kick',
                status: 'error',
                message: 'Token inválido'
            });
        });

        test('debe manejar todos los estados', () => {
            const statuses: Array<'connecting' | 'connected' | 'disconnected' | 'error'> = [
                'connecting',
                'connected',
                'disconnected',
                'error'
            ];

            statuses.forEach(status => {
                const result = SafeSocketEmitter.emitConnectionStatus(
                    mockIo,
                    'user-123',
                    'tiktok',
                    status
                );

                expect(result).toBe(true);
            });

            expect(mockEmit).toHaveBeenCalledTimes(4);
        });
    });

    describe('emitError', () => {
        test('debe emitir error correctamente', () => {
            const result = SafeSocketEmitter.emitError(
                mockIo,
                'user-123',
                'AUTH_ERROR',
                'Token expirado',
                'twitch'
            );

            expect(result).toBe(true);
            expect(mockTo).toHaveBeenCalledWith('user-123');
            expect(mockEmit).toHaveBeenCalledWith('error', {
                code: 'AUTH_ERROR',
                message: 'Token expirado'
            });
        });

        test('debe funcionar sin platform', () => {
            const result = SafeSocketEmitter.emitError(
                mockIo,
                'user-123',
                'GENERAL_ERROR',
                'Algo salió mal'
            );

            expect(result).toBe(true);
            expect(mockEmit).toHaveBeenCalledWith('error', {
                code: 'GENERAL_ERROR',
                message: 'Algo salió mal'
            });
        });
    });

    describe('Casos edge', () => {
        test('debe manejar objetos complejos válidos', () => {
            const complexData = {
                user: {
                    id: '123',
                    name: 'Test User',
                    badges: ['mod', 'subscriber']
                },
                message: {
                    text: 'Hello world',
                    timestamp: new Date().toISOString(),
                    emotes: [
                        { id: '1', name: 'Kappa', positions: [[0, 5]] }
                    ]
                }
            };

            const result = SafeSocketEmitter.emit(mockIo, {
                userId: 'user-123',
                event: 'chat_message',
                data: complexData,
                platform: 'twitch'
            });

            expect(result).toBe(true);
            expect(mockEmit).toHaveBeenCalledWith('chat_message', complexData);
        });

        test('debe manejar arrays', () => {
            const arrayData = [1, 2, 3, 4, 5];

            const result = SafeSocketEmitter.emit(mockIo, {
                userId: 'user-123',
                event: 'test_event',
                data: arrayData,
                platform: 'test'
            });

            expect(result).toBe(true);
            expect(mockEmit).toHaveBeenCalledWith('test_event', arrayData);
        });

        test('debe manejar strings', () => {
            const result = SafeSocketEmitter.emit(mockIo, {
                userId: 'user-123',
                event: 'test_event',
                data: 'simple string',
                platform: 'test'
            });

            expect(result).toBe(true);
            expect(mockEmit).toHaveBeenCalledWith('test_event', 'simple string');
        });

        test('debe manejar números', () => {
            const result = SafeSocketEmitter.emit(mockIo, {
                userId: 'user-123',
                event: 'test_event',
                data: 42,
                platform: 'test'
            });

            expect(result).toBe(true);
            expect(mockEmit).toHaveBeenCalledWith('test_event', 42);
        });

        test('debe manejar booleanos', () => {
            const result = SafeSocketEmitter.emit(mockIo, {
                userId: 'user-123',
                event: 'test_event',
                data: true,
                platform: 'test'
            });

            expect(result).toBe(true);
            expect(mockEmit).toHaveBeenCalledWith('test_event', true);
        });
    });

    describe('Múltiples sockets por usuario', () => {
        test('debe emitir a usuario con múltiples sockets', () => {
            // user-123 tiene 2 sockets según el mock
            const result = SafeSocketEmitter.emitChatMessage(
                mockIo,
                'user-123',
                { text: 'Hello' },
                'twitch'
            );

            expect(result).toBe(true);
            expect(mockTo).toHaveBeenCalledWith('user-123');
            // Socket.IO se encarga de emitir a todos los sockets del room
        });

        test('debe emitir a usuario con un solo socket', () => {
            // user-456 tiene 1 socket según el mock
            const result = SafeSocketEmitter.emitChatMessage(
                mockIo,
                'user-456',
                { text: 'Hello' },
                'twitch'
            );

            expect(result).toBe(true);
            expect(mockTo).toHaveBeenCalledWith('user-456');
        });
    });
});
