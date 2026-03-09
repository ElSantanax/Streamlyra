import { initiateOAuth } from '../oauth';
import { generatePKCE } from '../pkce';
import { dialog } from '../../dialog';
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

vi.mock('../../dialog', () => ({
    dialog: {
        alert: vi.fn(),
    }
}));

vi.mock('../pkce', () => ({
    generatePKCE: vi.fn(),
}));

describe('initiateOAuth', () => {
    const originalLocation = window.location;

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();

        // Reset location mock before each test
        Object.defineProperty(window, 'location', {
            value: {
                origin: 'http://localhost:5173',
                href: '',
                search: ''
            },
            writable: true
        });

        vi.stubEnv('VITE_TWITCH_CLIENT_ID', 'twitch-client-id');
        vi.stubEnv('VITE_YOUTUBE_CLIENT_ID', 'youtube-client-id');
        vi.stubEnv('VITE_KICK_CLIENT_ID', 'kick-client-id');
    });

    afterEach(() => {
        Object.defineProperty(window, 'location', {
            value: originalLocation,
            writable: true
        });
        vi.unstubAllEnvs();
    });

    it('debería mostrar una alerta y retornar si no se encuentra el clientId', async () => {
        vi.stubEnv('VITE_TWITCH_CLIENT_ID', '');

        await initiateOAuth('twitch');

        expect(dialog.alert).toHaveBeenCalledWith(
            'Falta VITE_TWITCH_CLIENT_ID en .env',
            {
                title: 'Error de configuración',
                variant: 'danger'
            }
        );
        expect(window.location.href).toBe('');
    });

    it('debería establecer auth_redirect en localStorage si se proporciona redirectParam', async () => {
        await initiateOAuth('twitch', '/dashboard');
        expect(localStorage.getItem('auth_redirect')).toBe('/dashboard');
    });

    it('debería establecer auth_redirect en localStorage desde window.location.search si no hay redirectParam', async () => {
        window.location.search = '?redirect=/settings';
        await initiateOAuth('twitch');
        expect(localStorage.getItem('auth_redirect')).toBe('/settings');
    });

    it('debería iniciar el flujo OAuth de twitch correctamente', async () => {
        await initiateOAuth('twitch');

        const params = new URLSearchParams(window.location.href.split('?')[1]);
        expect(window.location.href.startsWith('https://id.twitch.tv/oauth2/authorize')).toBe(true);
        expect(params.get('client_id')).toBe('twitch-client-id');
        expect(params.get('redirect_uri')).toBe('http://localhost:5173/auth/callback');
        expect(params.get('response_type')).toBe('code');
        expect(params.get('state')).toBe('twitch');
        expect(params.get('scope')).toContain('user:read:email');
    });

    it('debería iniciar el flujo OAuth de youtube correctamente con extras', async () => {
        vi.useFakeTimers();
        const fakeDate = new Date('2026-03-08T12:00:00Z');
        vi.setSystemTime(fakeDate);

        await initiateOAuth('youtube');

        const urlParts = window.location.href.split('?');
        const urlParams = new URL(window.location.href).searchParams;

        expect(urlParts[0]).toBe('https://accounts.google.com/o/oauth2/v2/auth');
        expect(urlParams.get('client_id')).toBe('youtube-client-id');
        expect(urlParams.get('redirect_uri')).toBe('http://localhost:5173/auth/callback');
        expect(urlParams.get('response_type')).toBe('code');
        expect(urlParams.get('state')).toBe(`youtube_${fakeDate.getTime()}`);
        expect(urlParams.get('scope')).toBe('https://www.googleapis.com/auth/youtube.force-ssl email profile');
        expect(urlParams.get('access_type')).toBe('offline');
        expect(urlParams.get('prompt')).toBe('select_account');
        expect(urlParams.get('include_granted_scopes')).toBe('false');

        vi.useRealTimers();
    });

    it('debería iniciar el flujo OAuth de kick correctamente con PKCE', async () => {
        const mockedVerifier = 'mock-verifier';
        const mockedChallenge = 'mock-challenge';
        (generatePKCE as Mock).mockResolvedValue({ verifier: mockedVerifier, challenge: mockedChallenge });

        await initiateOAuth('kick');

        expect(generatePKCE).toHaveBeenCalled();
        expect(localStorage.getItem('kick_verifier')).toBe(mockedVerifier);

        const params = new URLSearchParams(window.location.href.split('?')[1]);
        expect(window.location.href.startsWith('https://id.kick.com/oauth/authorize')).toBe(true);
        expect(params.get('client_id')).toBe('kick-client-id');
        expect(params.get('redirect_uri')).toBe('http://localhost:5173/auth/callback');
        expect(params.get('response_type')).toBe('code');
        expect(params.get('scope')).toContain('user:read');
        expect(params.get('state')).toBe('kick');
        expect(params.get('code_challenge')).toBe(mockedChallenge);
        expect(params.get('code_challenge_method')).toBe('S256');
    });
});
