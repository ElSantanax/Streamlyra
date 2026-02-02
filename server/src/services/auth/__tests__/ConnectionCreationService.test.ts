import { ConnectionCreationService } from '../ConnectionCreationService';
import { Connection } from '../../../models/Connection.model';
import { logger } from '../../../utils/logger';
import { AuthTokens } from '../../../types';
import { IConnectionRepository } from '../../../repositories/interfaces/IConnectionRepository';

// Mock dependencies
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
    let mockRepository: jest.Mocked<IConnectionRepository>;

    const mockUserId = 'user-123';
    const mockPlatform = 'twitch' as const;
    const mockTokens: AuthTokens = {
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        expires_in: 3600
    };

    beforeEach(() => {
        jest.clearAllMocks();

        mockRepository = {
            createOrUpdate: jest.fn(),
            findByUserId: jest.fn(),
            findByPlatform: jest.fn(),
            delete: jest.fn(),
            getConnection: jest.fn(),
        } as unknown as jest.Mocked<IConnectionRepository>;

        service = new ConnectionCreationService(mockRepository);
    });

    describe('createOrUpdate', () => {
        it('should call repository.createOrUpdate with correct parameters', async () => {
            const mockConnection = { id: 'conn-1' } as Connection;
            mockRepository.createOrUpdate.mockResolvedValue(mockConnection);

            const result = await service.createOrUpdate(
                mockUserId,
                mockPlatform,
                mockTokens,
                'provider-id-1',
                'username-1'
            );

            expect(mockRepository.createOrUpdate).toHaveBeenCalledWith(
                mockUserId,
                mockPlatform,
                'provider-id-1',
                'username-1',
                mockTokens,
                undefined, // transaction parameter
                undefined  // chatroomId parameter
            );

            expect(result).toBe(mockConnection);
            expect(logger.info).toHaveBeenCalledWith(
                expect.objectContaining({ userId: mockUserId, platform: mockPlatform }),
                'Creating or updating connection via repository'
            );
        });

        it('should handle errors gracefully', async () => {
            const error = new Error('Database connection failed');
            mockRepository.createOrUpdate.mockRejectedValue(error);

            try {
                await service.createOrUpdate(
                    mockUserId,
                    mockPlatform,
                    mockTokens,
                    'provider-id-1',
                    'username-1'
                );
                fail('Should have thrown an error');
            } catch (e: unknown) {
                expect(e).toBe(error);
                expect(logger.error).toHaveBeenCalledWith(
                    expect.objectContaining({ err: error, userId: mockUserId, platform: mockPlatform }),
                    'Error creating or updating connection'
                );
            }
        });
    });
});

