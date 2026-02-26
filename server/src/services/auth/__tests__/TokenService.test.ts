import { TokenService } from '../TokenService';
import { User } from '../../../models/User.model';
import jwt from 'jsonwebtoken';
import { config } from '../../../config';

jest.mock('jsonwebtoken');
jest.mock('../../../config', () => ({
    config: {
        jwtSecret: 'test-secret-key'
    }
}));

describe('TokenService', () => {
    describe('generateToken', () => {
        it('debe generar token JWT con datos de usuario correctos', () => {
            const mockUser = {
                id: 'user-123',
                username: 'testuser'
            } as User;

            const expectedToken = 'jwt-token-123';
            (jwt.sign as jest.Mock) = jest.fn().mockReturnValue(expectedToken);

            const result = TokenService.generateToken(mockUser);

            expect(jwt.sign).toHaveBeenCalledWith(
                { id: mockUser.id, username: mockUser.username },
                config.jwtSecret,
                { expiresIn: '7d' }
            );
            expect(result).toBe(expectedToken);
        });

        it('debe usar el secreto JWT configurado', () => {
            const mockUser = {
                id: 'user-456',
                username: 'anotheruser'
            } as User;

            (jwt.sign as jest.Mock) = jest.fn().mockReturnValue('token');

            TokenService.generateToken(mockUser);

            expect(jwt.sign).toHaveBeenCalledWith(
                expect.any(Object),
                'test-secret-key',
                expect.any(Object)
            );
        });

        it('debe configurar expiración de 7 días', () => {
            const mockUser = {
                id: 'user-789',
                username: 'expireuser'
            } as User;

            (jwt.sign as jest.Mock) = jest.fn().mockReturnValue('token');

            TokenService.generateToken(mockUser);

            expect(jwt.sign).toHaveBeenCalledWith(
                expect.any(Object),
                expect.any(String),
                { expiresIn: '7d' }
            );
        });
    });
});
