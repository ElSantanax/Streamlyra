import { AnalyticsService } from '../AnalyticsService';
import { UserAnalytics } from '../../../models/UserAnalytics.model';

jest.mock('../../../models/UserAnalytics.model');

describe('AnalyticsService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('updateLastFollower', () => {
        it('debe actualizar el último seguidor correctamente', async () => {
            const mockAnalytics = {
                userId: 'user-1',
                lastFollowerName: 'follower1',
                lastFollowerPlatform: 'twitch',
                lastFollowerAt: new Date()
            };

            (UserAnalytics.upsert as jest.Mock).mockResolvedValue([mockAnalytics]);

            const result = await AnalyticsService.updateLastFollower('user-1', 'twitch', 'follower1');

            expect(result).toEqual(mockAnalytics);
            expect(UserAnalytics.upsert).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user-1',
                lastFollowerName: 'follower1',
                lastFollowerPlatform: 'twitch'
            }));
        });

        it('debe retornar null cuando falla la actualización', async () => {
            (UserAnalytics.upsert as jest.Mock).mockRejectedValue(new Error('DB error'));

            const result = await AnalyticsService.updateLastFollower('user-1', 'twitch', 'follower1');

            expect(result).toBeNull();
        });
    });

    describe('getLastFollower', () => {
        it('debe retornar el último seguidor cuando no ha expirado', async () => {
            const recentDate = new Date(Date.now() - 1000 * 60 * 60);
            const mockAnalytics = {
                userId: 'user-1',
                lastFollowerName: 'follower1',
                lastFollowerPlatform: 'twitch',
                lastFollowerAt: recentDate
            };

            (UserAnalytics.findByPk as jest.Mock).mockResolvedValue(mockAnalytics);

            const result = await AnalyticsService.getLastFollower('user-1');

            expect(result).toEqual({
                name: 'follower1',
                platform: 'twitch',
                at: recentDate
            });
        });

        it('debe retornar null cuando el seguidor ha expirado', async () => {
            const expiredDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
            const mockAnalytics = {
                userId: 'user-1',
                lastFollowerName: 'follower1',
                lastFollowerPlatform: 'twitch',
                lastFollowerAt: expiredDate
            };

            (UserAnalytics.findByPk as jest.Mock).mockResolvedValue(mockAnalytics);

            const result = await AnalyticsService.getLastFollower('user-1');

            expect(result).toBeNull();
        });

        it('debe retornar null cuando no hay datos', async () => {
            (UserAnalytics.findByPk as jest.Mock).mockResolvedValue(null);

            const result = await AnalyticsService.getLastFollower('user-1');

            expect(result).toBeNull();
        });
    });

    describe('updateLastRaid', () => {
        it('debe actualizar el último raid correctamente', async () => {
            const mockAnalytics = {
                userId: 'user-1',
                lastRaidName: 'raider1',
                lastRaidPlatform: 'twitch',
                lastRaidViewers: 100,
                lastRaidAt: new Date()
            };

            (UserAnalytics.upsert as jest.Mock).mockResolvedValue([mockAnalytics]);

            const result = await AnalyticsService.updateLastRaid('user-1', 'twitch', 'raider1', 100);

            expect(result).toEqual(mockAnalytics);
            expect(UserAnalytics.upsert).toHaveBeenCalledWith(expect.objectContaining({
                userId: 'user-1',
                lastRaidName: 'raider1',
                lastRaidPlatform: 'twitch',
                lastRaidViewers: 100
            }));
        });

        it('debe retornar null cuando falla la actualización', async () => {
            (UserAnalytics.upsert as jest.Mock).mockRejectedValue(new Error('DB error'));

            const result = await AnalyticsService.updateLastRaid('user-1', 'twitch', 'raider1', 100);

            expect(result).toBeNull();
        });
    });

    describe('getLastRaid', () => {
        it('debe retornar el último raid cuando no ha expirado', async () => {
            const recentDate = new Date(Date.now() - 1000 * 60 * 60);
            const mockAnalytics = {
                userId: 'user-1',
                lastRaidName: 'raider1',
                lastRaidPlatform: 'twitch',
                lastRaidViewers: 100,
                lastRaidAt: recentDate
            };

            (UserAnalytics.findByPk as jest.Mock).mockResolvedValue(mockAnalytics);

            const result = await AnalyticsService.getLastRaid('user-1');

            expect(result).toEqual({
                name: 'raider1',
                platform: 'twitch',
                viewers: 100,
                at: recentDate
            });
        });

        it('debe retornar null cuando el raid ha expirado', async () => {
            const expiredDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000);
            const mockAnalytics = {
                userId: 'user-1',
                lastRaidName: 'raider1',
                lastRaidPlatform: 'twitch',
                lastRaidViewers: 100,
                lastRaidAt: expiredDate
            };

            (UserAnalytics.findByPk as jest.Mock).mockResolvedValue(mockAnalytics);

            const result = await AnalyticsService.getLastRaid('user-1');

            expect(result).toBeNull();
        });

        it('debe retornar null cuando no hay datos', async () => {
            (UserAnalytics.findByPk as jest.Mock).mockResolvedValue(null);

            const result = await AnalyticsService.getLastRaid('user-1');

            expect(result).toBeNull();
        });
    });
});
