import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticateToken, optionalAuthenticate, AuthRequest } from '../auth.middleware';
import { config } from '../../config';

jest.mock('../../utils/logger', () => ({
    logger: {
        warn: jest.fn(),
        debug: jest.fn(),
        error: jest.fn(),
    },
}));

describe('authenticateToken', () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    const validToken = jwt.sign({ id: 'user123', username: 'testuser' }, config.jwtSecret);

    beforeEach(() => {
        mockReq = {
            cookies: {},
            headers: {},
        };
        mockRes = {};
        mockNext = jest.fn();
    });

    it('debe autenticar correctamente con token válido en cookie', () => {
        mockReq.cookies = { auth_token: validToken };

        authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockReq.user).toEqual({ id: 'user123', username: 'testuser' });
        expect(mockNext).toHaveBeenCalledWith();
    });

    it('debe autenticar correctamente con token válido en header Authorization', () => {
        mockReq.headers = { authorization: `Bearer ${validToken}` };

        authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockReq.user).toEqual({ id: 'user123', username: 'testuser' });
        expect(mockNext).toHaveBeenCalledWith();
    });

    it('no debe autenticar cuando no se proporciona token', () => {
        authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Acceso denegado. Token no proporcionado.',
                statusCode: 401,
            })
        );
    });

    it('no debe autenticar con token expirado', () => {
        const expiredToken = jwt.sign(
            { id: 'user123', username: 'testuser' },
            config.jwtSecret,
            { expiresIn: '-1h' }
        );
        mockReq.cookies = { auth_token: expiredToken };

        authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Token expirado. Por favor, inicia sesión nuevamente.',
                statusCode: 403,
            })
        );
    });

    it('no debe autenticar con token inválido', () => {
        mockReq.cookies = { auth_token: 'token_invalido' };

        authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Token inválido.',
                statusCode: 403,
            })
        );
    });

    it('no debe autenticar con token que tiene estructura inválida', () => {
        const invalidStructureToken = jwt.sign({ id: 123 }, config.jwtSecret);
        mockReq.cookies = { auth_token: invalidStructureToken };

        authenticateToken(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(
            expect.objectContaining({
                message: 'Token con estructura inválida',
                statusCode: 403,
            })
        );
    });
});

describe('optionalAuthenticate', () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;
    let mockNext: NextFunction;
    const validToken = jwt.sign({ id: 'user123', username: 'testuser' }, config.jwtSecret);

    beforeEach(() => {
        mockReq = {
            cookies: {},
            headers: {},
        };
        mockRes = {};
        mockNext = jest.fn();
    });

    it('debe autenticar cuando se proporciona token válido', () => {
        mockReq.cookies = { auth_token: validToken };

        optionalAuthenticate(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockReq.user).toEqual({ id: 'user123', username: 'testuser' });
        expect(mockNext).toHaveBeenCalledWith();
    });

    it('debe continuar sin autenticar cuando no hay token', () => {
        optionalAuthenticate(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockReq.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalledWith();
    });

    it('debe continuar sin autenticar cuando el token es inválido', () => {
        mockReq.cookies = { auth_token: 'token_invalido' };

        optionalAuthenticate(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockReq.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalledWith();
    });

    it('debe continuar sin autenticar cuando el token está expirado', () => {
        const expiredToken = jwt.sign(
            { id: 'user123', username: 'testuser' },
            config.jwtSecret,
            { expiresIn: '-1h' }
        );
        mockReq.cookies = { auth_token: expiredToken };

        optionalAuthenticate(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockReq.user).toBeUndefined();
        expect(mockNext).toHaveBeenCalledWith();
    });
});
