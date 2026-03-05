import { AuthDTOBuilder } from '../AuthDTOBuilder';
import { User } from '../../../models/User.model';
import { TokenService } from '../TokenService';
import { buildUserDTO } from '../../../utils/userUtils';
import { StreamSessionManager } from '../../core/StreamSessionManager';

jest.mock('../TokenService');
jest.mock('../../../utils/userUtils');
jest.mock('../../core/StreamSessionManager');

describe('AuthDTOBuilder', () => {
    let builder: AuthDTOBuilder;
    let mockSessionManager: jest.Mocked<StreamSessionManager>;

    beforeEach(() => {
        builder = new AuthDTOBuilder();
        mockSessionManager = {
            isPlatformLive: jest.fn(),
            getSession: jest.fn()
        } as unknown as jest.Mocked<StreamSessionManager>;

        (StreamSessionManager.getInstance as jest.Mock).mockReturnValue(mockSessionManager);
        (TokenService.generateToken as jest.Mock).mockReturnValue('fake-jwt');
        (buildUserDTO as jest.Mock).mockImplementation((u) => ({ id: u.id, username: u.username }));
    });

    describe('buildAuthResponse', () => {
        it('debería construir una respuesta de autenticación completa', () => {
            const user = { id: 'u1', username: 'testuser' } as User;
            const res = builder.buildAuthResponse(user, true, 'login');

            expect(res).toEqual({
                token: 'fake-jwt',
                user: { id: 'u1', username: 'testuser' },
                connectionActive: true,
                activationReason: 'login'
            });
        });
    });

    describe('buildUserProfile', () => {
        it('debería construir un perfil básico sin conexiones ni analíticas', () => {
            const user = { id: 'u1', username: 'u' } as User;
            const res = builder.buildUserProfile(user);

            expect(res.user.id).toBe('u1');
            expect(res.connections.twitch.connected).toBe(false);
            expect(res.lastFollower).toBeNull();
            expect(res.lastRaid).toBeNull();
        });

        it('debería mapear conexiones activas y estados live', () => {
            const user = {
                id: 'u1',
                username: 'u',
                connections: [
                    { provider: 'twitch', providerUsername: 'tw_user' },
                    { provider: 'youtube', providerUsername: 'yt_user' }
                ]
            } as unknown as User;

            mockSessionManager.isPlatformLive.mockImplementation((_, plat) => plat === 'twitch');
            mockSessionManager.getSession.mockReturnValue({ isSessionActive: true, startTime: '2026-03-05T00:00:00Z' });

            const res = builder.buildUserProfile(user);

            expect(res.connections.twitch).toEqual({
                connected: true,
                username: 'tw_user',
                viewers: 0,
                isLive: true,
                sessionStartTime: '2026-03-05T00:00:00Z'
            });

            expect(res.connections.youtube).toEqual({
                connected: true,
                username: 'yt_user',
                viewers: 0,
                isLive: false,
                sessionStartTime: null
            });
        });

        it('debería incluir analíticas recientes (dentro de 7 días)', () => {
            const now = Date.now();
            const recentDate = new Date(now - 1000 * 60 * 60).toISOString(); // 1 hora atrás

            const user = {
                id: 'u1',
                analytics: {
                    lastFollowerName: 'Follower1',
                    lastFollowerPlatform: 'twitch',
                    lastFollowerAt: recentDate,
                    lastRaidName: 'Raider1',
                    lastRaidPlatform: 'kick',
                    lastRaidViewers: 50,
                    lastRaidAt: recentDate
                }
            } as unknown as User;

            const res = builder.buildUserProfile(user);

            expect(res.lastFollower?.name).toBe('Follower1');
            expect(res.lastRaid?.name).toBe('Raider1');
            expect(res.lastRaid?.viewers).toBe(50);
        });

        it('debería manejar una raid con 0 espectadores', () => {
            const recentDate = new Date().toISOString();
            const user = {
                id: 'u1',
                analytics: {
                    lastRaidName: 'RaiderZero',
                    lastRaidPlatform: 'twitch',
                    lastRaidViewers: 0,
                    lastRaidAt: recentDate
                }
            } as unknown as User;

            const res = builder.buildUserProfile(user);
            expect(res.lastRaid?.viewers).toBe(0);
        });

        it('debería ignorar analíticas antiguas (más de 7 días)', () => {
            const oldDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();

            const user = {
                id: 'u1',
                analytics: {
                    lastFollowerName: 'OldFollower',
                    lastFollowerAt: oldDate
                }
            } as unknown as User;

            const res = builder.buildUserProfile(user);

            expect(res.lastFollower).toBeNull();
        });
    });
});
