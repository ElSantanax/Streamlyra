import { Socket } from 'socket.io';
import { SocketErrorHandler } from '../SocketErrorHandler';

describe('SocketErrorHandler', () => {
    let mockSocket: jest.Mocked<Socket>;

    beforeEach(() => {
        mockSocket = {
            id: 'socket-123',
            emit: jest.fn()
        } as unknown as jest.Mocked<Socket>;
    });

    describe('emitValidationError', () => {
        it('debe emitir error de validación con código y mensaje', () => {
            SocketErrorHandler.emitValidationError(mockSocket, 'INVALID_PAYLOAD', 'Payload inválido');

            expect(mockSocket.emit).toHaveBeenCalledWith('message_send_error', {
                code: 'INVALID_PAYLOAD',
                message: 'Payload inválido'
            });
        });
    });

    describe('emitAuthorizationError', () => {
        it('debe emitir error de autorización', () => {
            SocketErrorHandler.emitAuthorizationError(mockSocket, 'user-1', 'user-2', 'send message');

            expect(mockSocket.emit).toHaveBeenCalledWith('message_send_error', {
                code: 'UNAUTHORIZED',
                message: 'No autorizado'
            });
        });
    });

    describe('emitInternalError', () => {
        it('debe emitir error interno', () => {
            const error = new Error('Test error');
            SocketErrorHandler.emitInternalError(mockSocket, error, 'test context');

            expect(mockSocket.emit).toHaveBeenCalledWith('message_send_error', {
                code: 'INTERNAL_ERROR',
                message: 'Error interno'
            });
        });
    });

    describe('emitModerationError', () => {
        it('debe emitir error de moderación', () => {
            SocketErrorHandler.emitModerationError(mockSocket, 'INVALID_ACTION', 'Acción inválida');

            expect(mockSocket.emit).toHaveBeenCalledWith('moderation_error', {
                code: 'INVALID_ACTION',
                message: 'Acción inválida'
            });
        });
    });
});
