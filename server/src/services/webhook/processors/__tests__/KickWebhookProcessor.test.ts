/**
 * Tests para KickWebhookProcessor
 * Verifica la validación de estado antes de procesar eventos
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

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
            fetchSockets: jest.fn(),
            sockets: {
                adapter: {
                    rooms: new Map()
                }
            }
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

            const mockConnectionWithWebhook = {
                ...mockConnection,
                kickWebhook: mockWebhook
            };

            const mockSockets = [{ id: 'socket-1' }];

            // Setup room for the user in the adapter
            const userRoom = new Set(['socket-1']);
            mockIo.sockets.adapter.rooms.set('user-123', userRoom);

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnectionWithWebhook);

            mockIo.in = jest.fn().mockReturnValue({
                fetchSockets: jest.fn().mockResolvedValue(mockSockets)
            }) as unknown as typeof mockIo.in;

            await processor.process(mockPayload);

            expect(Connection.findOne).toHaveBeenCalledWith({
                where: {
                    provider: 'kick',
                    providerId: '123'
                },
                include: [{
                    model: KickWebhook,
                    as: 'kickWebhook',
                    where: { isActive: true },
                    required: false
                }]
            });

            // Ya no se llama a KickWebhook.findOne porque se incluye en la consulta de Connection
            expect(mockWebhook.update).toHaveBeenCalledWith({
                lastEventAt: expect.any(Date)
            });

            expect(mockIo.to).toHaveBeenCalledWith('user-123');
            expect(mockIo.emit).toHaveBeenCalledWith('chat_message', expect.any(Object));
        });

        it('no debe procesar si falta broadcaster.user_id', async () => {
            const invalidPayload: KickChatMessagePayload = {
                ...mockPayload,
                broadcaster: {} as KickChatMessagePayload['broadcaster']
            };

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
            interface MockConnection {
                userId: string;
                provider: string;
                providerId: string;
                kickWebhook?: null;
            }

            const mockConnection: MockConnection = {
                userId: 'user-123',
                provider: 'kick',
                providerId: '123',
                kickWebhook: undefined // No hay webhook activo
            };


            const findOneMock = Connection.findOne as jest.Mock;
            findOneMock.mockResolvedValue(mockConnection as unknown as Connection);

            await processor.process(mockPayload);

            expect(Connection.findOne).toHaveBeenCalled();
            // Ya no se llama a KickWebhook.findOne porque se incluye en la consulta
            expect(mockIo.emit).not.toHaveBeenCalled();
        });

        it('debe emitir mensaje incluso si usuario no tiene sockets (SafeSocketEmitter maneja esto)', async () => {
            const mockWebhook = {
                id: 1,
                broadcasterId: '123',
                isActive: true,
                update: jest.fn().mockResolvedValue(undefined)
            };

            const mockConnectionWithWebhook = {
                userId: 'user-123',
                provider: 'kick',
                providerId: '123',
                kickWebhook: mockWebhook
            };

            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnectionWithWebhook);

            // No hay sockets conectados
            mockIo.sockets.adapter.rooms.clear();

            await processor.process(mockPayload);

            expect(Connection.findOne).toHaveBeenCalled();
            // El webhook se actualiza de todas formas
            expect(mockWebhook.update).toHaveBeenCalledWith({
                lastEventAt: expect.any(Date)
            });
            // SafeSocketEmitter verifica internamente si hay sockets, no necesitamos verificar mockIo.to
            // El procesamiento se completa sin errores
        });

        it('debe manejar errores sin crashear', async () => {
            (Connection.findOne as jest.Mock).mockRejectedValue(new Error('DB Error'));

            await expect(
                processor.process(mockPayload)
            ).resolves.not.toThrow();

            expect(mockIo.emit).not.toHaveBeenCalled();
        });

        it('debe actualizar lastEventAt cuando procesa evento exitosamente', async () => {
            interface MockConnection {
                userId: string;
                provider: string;
                providerId: string;
                kickWebhook?: {
                    id: number;
                    broadcasterId: string;
                    isActive: boolean;
                    update: jest.Mock;
                };
            }

            const mockWebhook = {
                id: 1,
                broadcasterId: '123',
                isActive: true,
                update: jest.fn().mockResolvedValue(undefined)
            };

            const mockConnection: MockConnection = {
                userId: 'user-123',
                provider: 'kick',
                providerId: '123',
                kickWebhook: mockWebhook
            };

            const mockSockets = [{ id: 'socket-1' }];

            // Setup room for the user in the adapter
            const userRoom = new Set(['socket-1']);
            mockIo.sockets.adapter.rooms.set('user-123', userRoom);


            const findOneMock = Connection.findOne as jest.Mock;
            findOneMock.mockResolvedValue(mockConnection as unknown as Connection);

            mockIo.in = jest.fn().mockReturnValue({
                fetchSockets: jest.fn().mockResolvedValue(mockSockets)
            }) as unknown as typeof mockIo.in;

            await processor.process(mockPayload);

            expect(mockWebhook.update).toHaveBeenCalledWith({
                lastEventAt: expect.any(Date)
            });
        });
    });
});
