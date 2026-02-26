import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validateZodBody } from '../zod.middleware';
import { AppError } from '../../utils/AppError';

describe('zod.middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
        mockRequest = {
            body: {}
        };
        mockResponse = {};
        mockNext = jest.fn();
    });

    describe('validateZodBody', () => {
        it('debe validar correctamente body con schema simple', () => {
            const schema = z.object({
                name: z.string(),
                age: z.number()
            });

            mockRequest.body = {
                name: 'John',
                age: 30
            };

            const middleware = validateZodBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
            expect(mockRequest.body).toEqual({ name: 'John', age: 30 });
        });

        it('debe transformar datos según schema', () => {
            const schema = z.object({
                count: z.string().transform(val => parseInt(val, 10))
            });

            mockRequest.body = {
                count: '42'
            };

            const middleware = validateZodBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
            expect(mockRequest.body).toEqual({ count: 42 });
        });

        it('debe rechazar body cuando falta campo requerido', () => {
            const schema = z.object({
                username: z.string(),
                email: z.string()
            });

            mockRequest.body = {
                username: 'testuser'
            };

            const middleware = validateZodBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = mockNext.mock.calls[0][0] as unknown as AppError;
            expect(error.message).toContain('email es requerido');
            expect(error.statusCode).toBe(400);
        });

        it('debe rechazar body cuando tipo de dato es incorrecto', () => {
            const schema = z.object({
                age: z.number()
            });

            mockRequest.body = {
                age: 'not-a-number'
            };

            const middleware = validateZodBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = mockNext.mock.calls[0][0] as unknown as AppError;
            expect(error.message).toContain('age');
            expect(error.statusCode).toBe(400);
        });

        it('debe formatear múltiples errores correctamente', () => {
            const schema = z.object({
                username: z.string(),
                email: z.string().email({ message: 'Invalid email' }),
                age: z.number()
            });

            mockRequest.body = {
                email: 'invalid-email'
            };

            const middleware = validateZodBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = mockNext.mock.calls[0][0] as unknown as AppError;
            expect(error.message).toContain('username es requerido');
            expect(error.message).toContain('age es requerido');
        });

        it('debe validar correctamente schema con campos opcionales', () => {
            const schema = z.object({
                name: z.string(),
                nickname: z.string().optional()
            });

            mockRequest.body = {
                name: 'John'
            };

            const middleware = validateZodBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
            expect(mockRequest.body).toEqual({ name: 'John' });
        });

        it('debe validar correctamente schema con valores por defecto', () => {
            const schema = z.object({
                name: z.string(),
                role: z.string().default('user')
            });

            mockRequest.body = {
                name: 'John'
            };

            const middleware = validateZodBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
            expect(mockRequest.body).toEqual({ name: 'John', role: 'user' });
        });

        it('debe validar correctamente schema con validaciones personalizadas', () => {
            const schema = z.object({
                password: z.string().min(8)
            });

            mockRequest.body = {
                password: 'short'
            };

            const middleware = validateZodBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = mockNext.mock.calls[0][0] as unknown as AppError;
            expect(error.message).toContain('password');
        });

        it('debe validar correctamente schema con objetos anidados', () => {
            const schema = z.object({
                user: z.object({
                    name: z.string(),
                    email: z.string().email({ message: 'Invalid email' })
                })
            });

            mockRequest.body = {
                user: {
                    name: 'John',
                    email: 'john@example.com'
                }
            };

            const middleware = validateZodBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
            expect(mockRequest.body).toEqual({
                user: {
                    name: 'John',
                    email: 'john@example.com'
                }
            });
        });

        it('debe rechazar cuando falta campo en objeto anidado', () => {
            const schema = z.object({
                user: z.object({
                    name: z.string(),
                    email: z.string()
                })
            });

            mockRequest.body = {
                user: {
                    name: 'John'
                }
            };

            const middleware = validateZodBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = mockNext.mock.calls[0][0] as unknown as AppError;
            expect(error.message).toContain('user.email es requerido');
        });

        it('debe validar correctamente arrays', () => {
            const schema = z.object({
                tags: z.array(z.string())
            });

            mockRequest.body = {
                tags: ['tag1', 'tag2', 'tag3']
            };

            const middleware = validateZodBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
            expect(mockRequest.body).toEqual({ tags: ['tag1', 'tag2', 'tag3'] });
        });

        it('debe rechazar cuando array contiene tipo incorrecto', () => {
            const schema = z.object({
                numbers: z.array(z.number())
            });

            mockRequest.body = {
                numbers: [1, 2, 'three']
            };

            const middleware = validateZodBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
            const error = mockNext.mock.calls[0][0] as unknown as AppError;
            expect(error.message).toContain('numbers');
        });

        it('debe eliminar campos no definidos en schema', () => {
            const schema = z.object({
                name: z.string()
            }).strict();

            mockRequest.body = {
                name: 'John',
                extraField: 'should-be-removed'
            };

            const middleware = validateZodBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith(expect.any(AppError));
        });

        it('debe validar correctamente body vacío cuando schema lo permite', () => {
            const schema = z.object({}).optional();

            mockRequest.body = {};

            const middleware = validateZodBody(schema);
            middleware(mockRequest as Request, mockResponse as Response, mockNext);

            expect(mockNext).toHaveBeenCalledWith();
        });
    });
});
