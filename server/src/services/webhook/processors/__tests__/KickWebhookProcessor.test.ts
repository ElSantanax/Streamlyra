/**
 * Tests para KickWebhookProcessor
 * Verifica la validación de estado antes de procesar eventos
 */

// Mocks
jest.mock('../../../../models/Connection.model');
jest.mock('../../../../models/KickWebhook.model');

import { Server } from 'socket.io';
import { KickWebhookProcessor } from '../KickWebhookProcessor';
import { Connection } from '../../../../models/Connection.model';
import { KickWebhook } from '../../../../models/KickWebhook.model';
import { KickChatMessagePayload } from '../../../../types/kick.types';

describe('KickWebhookProcessor', () => {
    let processor: KickWebhookProcessor;
    let mockIo: jest.Mocked<Server>;

    const mockPayload: KickChatMessagePayload = {
        message_id: 'msg-1',
        broadcaster: {
            user_id: 123,
            username: 'test_broadcaster',
            is_anonymous: false,
            is_verified: true,
            profile_picture: 'https://example.com/avatar.jpg',
            channel_slug: 'test_broadcaster'
        },
        sender: {
            user_id: 456,
            username: 'test_sender',
            is_anonymous: false,
            is_verified: false,
            profile_picture: 'https://example.com/sender.jpg',
            channel_slug: 'test_sender'
        },
        content: 'Test message',
        created_at: '2024-01-01T00:00:00Z'
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockIo = {
            to: jest.fn().mockReturnThis(),
            emit: jest.fn(),
            in: jest.fn().mockReturnThis(),
            fetchSockets: jest.fn()
        } as unknown as jest.Mocked<Server>;

        processor = new KickWebhookProcessor(mockIo);
    });

    describe('process', () => {
        it('debe procesar evento cuando webhook está activo y usuario conectado', async () => {
            const mockConnection = {
                userId: 'user-123',
                provider: 'kick',
                providerId: '123'
            };

            const mockWebhook = {
                id: 1,
                broadcasterId: '123',
                isActive: true,
                update: jest.fn().mockResolvedValue(undefined)
            };

            const mockSockets = [{ id: 'socket-1' }];

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            (KickWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
            (mockIo.in as jest.Mock).mockReturnValue({
                fetchSockets: jest.fn().mockResolvedValue(mockSockets)
            });

            await processor.process(mockPayload);

            expect(Connection.findOne).toHaveBeenCalledWith({
                where: {
                    provider: 'kick',
                    providerId: '123'
                }
            });

            expect(KickWebhook.findOne).toHaveBeenCalledWith({
                where: {
                    broadcasterId: '123',
                    isActive: true
                }
            });

            expect(mockWebhook.update).toHaveBeenCalledWith({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                lastEventAt: expect.any(Date)
            });

            expect(mockIo.to).toHaveBeenCalledWith('user-123');
            expect(mockIo.emit).toHaveBeenCalledWith('chat_message', expect.any(Object));
        });

        it('no debe procesar si falta broadcaster.user_id', async () => {
            const invalidPayload = {
                ...mockPayload,
                broadcaster: {}
            } as KickChatMessagePayload;

            await processor.process(invalidPayload);

            expect(Connection.findOne).not.toHaveBeenCalled();
            expect(mockIo.emit).not.toHaveBeenCalled();
        });

        it('no debe procesar si no encuentra conexión', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue(null);

            await processor.process(mockPayload);

            expect(Connection.findOne).toHaveBeenCalled();
            expect(KickWebhook.findOne).not.toHaveBeenCalled();
            expect(mockIo.emit).not.toHaveBeenCalled();
        });

        it('no debe procesar si webhook está inactivo', async () => {
            const mockConnection = {
                userId: 'user-123',
                provider: 'kick',
                providerId: '123'
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            (KickWebhook.findOne as jest.Mock).mockResolvedValue(null); // No encuentra webhook activo

            await processor.process(mockPayload);

            expect(Connection.findOne).toHaveBeenCalled();
            expect(KickWebhook.findOne).toHaveBeenCalled();
            expect(mockIo.emit).not.toHaveBeenCalled();
        });

        it('no debe procesar si usuario no tiene sockets conectados', async () => {
            const mockConnection = {
                userId: 'user-123',
                provider: 'kick',
                providerId: '123'
            };

            const mockWebhook = {
                id: 1,
                broadcasterId: '123',
                isActive: true,
                update: jest.fn()
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            (KickWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
            (mockIo.in as jest.Mock).mockReturnValue({
                fetchSockets: jest.fn().mockResolvedValue([]) // Sin sockets
            });

            await processor.process(mockPayload);

            expect(Connection.findOne).toHaveBeenCalled();
            expect(KickWebhook.findOne).toHaveBeenCalled();
            expect(mockWebhook.update).not.toHaveBeenCalled();
            expect(mockIo.emit).not.toHaveBeenCalled();
        });

        it('debe manejar errores sin crashear', async () => {
            (Connection.findOne as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(
                processor.process(mockPayload)
            ).resolves.not.toThrow();

            expect(mockIo.emit).not.toHaveBeenCalled();
        });

        it('debe actualizar lastEventAt cuando procesa evento exitosamente', async () => {
            const mockConnection = {
                userId: 'user-123',
                provider: 'kick',
                providerId: '123'
            };

            const mockWebhook = {
                id: 1,
                broadcasterId: '123',
                isActive: true,
                update: jest.fn().mockResolvedValue(undefined)
            };

            const mockSockets = [{ id: 'socket-1' }];

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            (KickWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);
            (mockIo.in as jest.Mock).mockReturnValue({
                fetchSockets: jest.fn().mockResolvedValue(mockSockets)
            });

            await processor.process(mockPayload);

            expect(mockWebhook.update).toHaveBeenCalledWith({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                lastEventAt: expect.any(Date)
            });
        });
    });
});
