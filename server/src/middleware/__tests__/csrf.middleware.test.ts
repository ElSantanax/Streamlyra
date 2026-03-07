import crypto from 'crypto';
import { Response, NextFunction } from 'express';
import { setCsrfCookie, verifyCsrf } from '../csrf.middleware';
import type { AuthRequest } from '../auth.middleware';
import { AppError } from '../../utils/AppError';

jest.mock('../../config', () => ({
    config: {
        nodeEnv: 'test',
        cookie: {
            secure: false,
            sameSite: 'lax' as const,
            domain: 'localhost',
            maxAge: 86400000
        }
    }
}));

function makeReq(overrides: Partial<AuthRequest> = {}): AuthRequest {
    return {
        method: 'POST',
        path: '/api/user/profile',
        cookies: {},
        headers: {},
        ...overrides
    } as AuthRequest;
}

function makeRes(): jest.Mocked<Response> {
    return {
        cookie: jest.fn()
    } as unknown as jest.Mocked<Response>;
}

describe('setCsrfCookie', () => {
    let next: NextFunction;

    beforeEach(() => {
        next = jest.fn();
    });

    it('debería hacer next() sin tocar cookies en paths excluidos (/api/webhooks)', () => {
        const req = makeReq({ path: '/api/webhooks/kick' });
        const res = makeRes();

        setCsrfCookie(req, res, next);

        expect(next).toHaveBeenCalledWith();
        expect(res.cookie).not.toHaveBeenCalled();
    });

    it('debería generar y setear una cookie csrf si no existe', () => {
        const req = makeReq({ cookies: {} });
        const res = makeRes();

        setCsrfCookie(req, res, next);

        expect(res.cookie).toHaveBeenCalledWith(
            'csrf_token',
            expect.any(String),
            expect.objectContaining({
                httpOnly: false,
                path: '/'
            })
        );

        const generatedToken = (res.cookie as jest.Mock).mock.calls[0][1] as string;
        expect(generatedToken).toHaveLength(64);
        expect(/^[0-9a-f]+$/.test(generatedToken)).toBe(true);

        expect(next).toHaveBeenCalledWith();
    });

    it('NO debería regenerar la cookie csrf si ya existe', () => {
        const req = makeReq({ cookies: { csrf_token: 'token_existente' } });
        const res = makeRes();

        setCsrfCookie(req, res, next);

        expect(res.cookie).not.toHaveBeenCalled();
        expect(next).toHaveBeenCalledWith();
    });
});

describe('verifyCsrf', () => {
    let next: NextFunction;
    const VALID_TOKEN = crypto.randomBytes(32).toString('hex');

    beforeEach(() => {
        next = jest.fn();
    });

    describe('shouldValidateCsrf: casos que omiten la validación', () => {
        it('debería omitir validación para métodos seguros (GET)', () => {
            const req = makeReq({
                method: 'GET',
                cookies: { auth_token: 'some_auth', csrf_token: VALID_TOKEN }
            });

            verifyCsrf(req, makeRes(), next);

            expect(next).toHaveBeenCalledWith();
            expect((next as jest.Mock).mock.calls[0][0]).toBeUndefined();
        });

        it('debería omitir validación para HEAD', () => {
            const req = makeReq({ method: 'HEAD', cookies: { auth_token: 'auth' } });
            verifyCsrf(req, makeRes(), next);
            expect(next).toHaveBeenCalledWith();
        });

        it('debería omitir validación para OPTIONS', () => {
            const req = makeReq({ method: 'OPTIONS', cookies: { auth_token: 'auth' } });
            verifyCsrf(req, makeRes(), next);
            expect(next).toHaveBeenCalledWith();
        });

        it('debería omitir validación en paths excluidos (/api/webhooks) aun con método mutante', () => {
            const req = makeReq({
                method: 'POST',
                path: '/api/webhooks/twitch',
                cookies: { auth_token: 'auth' }
            });

            verifyCsrf(req, makeRes(), next);

            expect(next).toHaveBeenCalledWith();
            expect((next as jest.Mock).mock.calls[0][0]).toBeUndefined();
        });

        it('debería omitir validación si el usuario NO está autenticado (sin auth_token)', () => {
            const req = makeReq({
                method: 'POST',
                path: '/api/user/profile',
                cookies: {}
            });

            verifyCsrf(req, makeRes(), next);

            expect(next).toHaveBeenCalledWith();
            expect((next as jest.Mock).mock.calls[0][0]).toBeUndefined();
        });
    });

    describe('validación activa (método mutante + autenticado + path no excluido)', () => {
        function makeAuthReq(headerToken?: string, cookieToken?: string): AuthRequest {
            return makeReq({
                method: 'POST',
                path: '/api/user/profile',
                cookies: {
                    auth_token: 'valid_auth',
                    ...(cookieToken ? { csrf_token: cookieToken } : {})
                },
                headers: {
                    ...(headerToken ? { 'x-csrf-token': headerToken } : {})
                }
            });
        }

        it('debería pasar next(error 403) si falta la cookie csrf', () => {
            const req = makeAuthReq('some_header_token', undefined);

            verifyCsrf(req, makeRes(), next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const err = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(err.statusCode).toBe(403);
            expect(err.message).toContain('CSRF token inválido o ausente');
        });

        it('debería pasar next(error 403) si falta el header csrf', () => {
            const req = makeAuthReq(undefined, VALID_TOKEN);

            verifyCsrf(req, makeRes(), next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const err = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(err.statusCode).toBe(403);
        });

        it('debería pasar next(error 403) si cookie y header son de distinta longitud', () => {
            const req = makeAuthReq('short', VALID_TOKEN);

            verifyCsrf(req, makeRes(), next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const err = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(err.statusCode).toBe(403);
            expect(err.message).toContain('CSRF token inválido');
        });

        it('debería pasar next(error 403) si los tokens no coinciden (misma longitud)', () => {
            const wrongToken = 'a'.repeat(VALID_TOKEN.length);
            const req = makeAuthReq(wrongToken, VALID_TOKEN);

            verifyCsrf(req, makeRes(), next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const err = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(err.statusCode).toBe(403);
        });

        it('debería llamar next() sin error si cookie y header coinciden exactamente', () => {
            const req = makeAuthReq(VALID_TOKEN, VALID_TOKEN);

            verifyCsrf(req, makeRes(), next);

            expect(next).toHaveBeenCalledWith();
            expect((next as jest.Mock).mock.calls[0][0]).toBeUndefined();
        });

        it('debería pasar next(error 403) si ambos tokens faltan', () => {
            const req = makeAuthReq(undefined, undefined);

            verifyCsrf(req, makeRes(), next);

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const err = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(err.statusCode).toBe(403);
        });
    });
});