import { generatePKCE } from '../pkce';
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';

describe('generatePKCE', () => {
    let originalCrypto: Crypto;

    beforeAll(() => {
        originalCrypto = window.crypto;

        // Mocking window.crypto.subtle.digest for node/jsdom environment
        Object.defineProperty(window, 'crypto', {
            value: {
                subtle: {
                    digest: vi.fn().mockImplementation(async () => {
                        // Return a dummy ArrayBuffer of length 32 (like SHA-256)
                        return new Uint8Array(32).fill(1).buffer;
                    })
                }
            },
            writable: true
        });
    });

    afterAll(() => {
        Object.defineProperty(window, 'crypto', {
            value: originalCrypto,
            writable: true
        });
    });

    it('debería generar un verificador y un desafío', async () => {
        const { verifier, challenge } = await generatePKCE();

        // Verifier length should be 128
        expect(verifier).toHaveLength(128);
        expect(typeof verifier).toBe('string');

        // Challenge should be a base64 string
        expect(typeof challenge).toBe('string');
        expect(challenge.length).toBeGreaterThan(0);
        // Ensure no +, /, or = characters (Base64URL encoding)
        expect(challenge).not.toMatch(/[+/=]/);
    });

    it('debería llamar a window.crypto.subtle.digest con SHA-256 y los datos del verificador', async () => {
        await generatePKCE();

        // Ensure digest was called
        expect(window.crypto.subtle.digest).toHaveBeenCalledWith(
            'SHA-256',
            expect.anything()
        );
    });
});
