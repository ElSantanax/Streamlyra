/**
 * Tests adicionales para KickWebhookProcessor
 * Verifica procesamiento de nuevos tipos de eventos
 */

// Mocks
jest.mock('../../../../models/Connection.model');
jest.mock('../../../../models/KickWebhook.model');

import { Server } from 'socket.io';
import { KickWebhookProcessor } from '../KickWebhookProcessor';
import { Connection } from '../../../../models/Connection.model';
import { KickWebhook } from '../../../../models/KickWebhook.model';
import { KickFollowEvent, KickSubscriptionEvent } from '../../../../types/kick.types';

describe('KickWebhookProcessor Extended', () => {
    let processor: KickWebhookProcessor;
    let mockIo: jest.Mocked<Server>;

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

    describe('Event Types', () => {
        const mockWebhook = {
            id: 1,
            broadcasterId: '123',
            isActive: true,
            update: jest.fn().mockResolvedValue(undefined)
        };

        const mockConnection = {
            userId: 'user-123',
            provider: 'kick',
            providerId: '123',
            kickWebhook: mockWebhook
        };

        beforeEach(() => {
            (Connection.findOne as jest.Mock).mockResolvedValue(mockConnection);
            (KickWebhook.findOne as jest.Mock).mockResolvedValue(mockWebhook);

            // Simular usuario conectado (requerido por SafeSocketEmitter)
            mockIo.sockets.adapter.rooms.set('user-123', new Set(['socket-1']));
        });

        it('debe procesar evento channel.follow', async () => {
            const followPayload: KickFollowEvent = {
                username: 'new_follower',
                follower_user_id: 456,
                channel_id: 123,
                broadcaster_user_id: 123,
                created_at: '2024-01-01T00:00:00Z'
            };

            await processor.process(followPayload, 'channel.follow');

            expect(mockIo.emit).toHaveBeenCalledWith('chat_message', expect.objectContaining({
                specialMessage: '👤 NUEVO SEGUIDOR',
                user: 'new_follower',
                platform: 'kick'
            }));
        });

        it('debe procesar evento channel.subscription.new', async () => {
            const subPayload: KickSubscriptionEvent = {
                broadcaster: {
                    user_id: 123,
                    username: 'test_broadcaster',
                    is_anonymous: false,
                    is_verified: true,
                    profile_picture: 'avatar.jpg',
                    channel_slug: 'test_broadcaster'
                },
                subscriber: {
                    user_id: 789,
                    username: 'new_sub',
                    is_anonymous: false,
                    is_verified: false,
                    profile_picture: 'avatar.jpg',
                    channel_slug: 'new_sub'
                },
                duration: 1,
                created_at: '2024-01-01T00:00:00Z'
            };

            await processor.process(subPayload, 'channel.subscription.new');

            expect(mockIo.emit).toHaveBeenCalledWith('chat_message', expect.objectContaining({
                // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
                specialMessage: expect.stringContaining('NUEVA SUSCRIPCIÓN'),
                user: 'new_sub',
                platform: 'kick'
            }));
        });
    });
});
