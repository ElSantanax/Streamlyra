import { ConnectionCreationService } from '../ConnectionCreationService';
import { Connection } from '../../../models/Connection.model';
import { logger } from '../../../utils/logger';
import { AuthTokens } from '../../../types';

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

// Mock dependencies
jest.mock('../../../models/Connection.model');
jest.mock('../../../utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        warn: jest.fn(),
    }
}));

describe('ConnectionCreationService', () => {
    let service: ConnectionCreationService;
    const mockUserId = 'user-123';
    const mockPlatform = 'twitch' as const;
    const mockTokens: AuthTokens = {
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        expires_in: 3600
    };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new ConnectionCreationService();
    });

    describe('createOrUpdate', () => {
        it('should update existing connection if found', async () => {
            // Mock existing connection
            interface MockConnection {
                id: string;
                userId: string;
                provider: string;
                update: jest.Mock;
            }
            
            const mockConnection: MockConnection = {
                id: 'conn-1',
                userId: mockUserId,
                provider: mockPlatform,
                update: jest.fn().mockResolvedValue(true)
            };

            const findOneMock = Connection.findOne as jest.Mock;
            findOneMock.mockResolvedValue(mockConnection as unknown as Connection);

            const result = await service.createOrUpdate(
                mockUserId,
                mockPlatform,
                mockTokens,
                'provider-id-1',
                'username-1'
            );

            expect(Connection.findOne).toHaveBeenCalledWith({
                where: { userId: mockUserId, provider: mockPlatform }
            });

            expect(mockConnection.update).toHaveBeenCalledWith({
                accessToken: mockTokens.access_token,
                refreshToken: mockTokens.refresh_token,
                expiresAt: expect.any(Date),
                providerId: 'provider-id-1',
                providerUsername: 'username-1'
            });

            expect(result).toBe(mockConnection);
            expect(logger.info).toHaveBeenCalledWith(
                expect.objectContaining({ userId: mockUserId }),
                'Updating existing connection'
            );
        });

        it('should use existing provider details if new ones not provided during update', async () => {
            interface MockConnection {
                id: string;
                userId: string;
                provider: string;
                providerId: string;
                providerUsername: string;
                update: jest.Mock;
            }
            
            const mockConnection: MockConnection = {
                id: 'conn-1',
                userId: mockUserId,
                provider: mockPlatform,
                providerId: 'old-id',
                providerUsername: 'old-user',
                update: jest.fn().mockResolvedValue(true)
            };

             
            const findOneMock = Connection.findOne as jest.Mock;
            findOneMock.mockResolvedValue(mockConnection as unknown as Connection);

            await service.createOrUpdate(
                mockUserId,
                mockPlatform,
                mockTokens
            );

            expect(mockConnection.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    providerId: 'old-id', // Should preserve old value
                    providerUsername: 'old-user'
                })
            );
        });

        it('should create new connection if not found', async () => {
            (Connection.findOne as jest.Mock).mockResolvedValue(null);

            const newConnectionMock = { id: 'new-conn' };
            (Connection.create as jest.Mock).mockResolvedValue(newConnectionMock);

            const result = await service.createOrUpdate(
                mockUserId,
                mockPlatform,
                mockTokens,
                'provider-id-1',
                'username-1'
            );

            expect(Connection.create).toHaveBeenCalledWith({
                userId: mockUserId,
                provider: mockPlatform,
                accessToken: mockTokens.access_token,
                refreshToken: mockTokens.refresh_token,
                expiresAt: expect.any(Date),
                providerId: 'provider-id-1',
                providerUsername: 'username-1'
            });

            expect(result).toBe(newConnectionMock);
            expect(logger.info).toHaveBeenCalledWith(
                expect.objectContaining({ userId: mockUserId }),
                'Creating new connection'
            );
        });

        it('should handle errors gracefully', async () => {
            const error = new Error('Database connection failed');
            (Connection.findOne as jest.Mock).mockRejectedValue(error);

            try {
                await service.createOrUpdate(mockUserId, mockPlatform, mockTokens);
                fail('Should have thrown an error');
            } catch (e: unknown) {
                expect(e).toBe(error);
                expect(logger.error).toHaveBeenCalledWith(
                    expect.objectContaining({ err: error }),
                    'Error creating or updating connection'
                );
            }
        });
    });
});
