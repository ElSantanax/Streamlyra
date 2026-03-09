import { normalizeError, getUserFriendlyMessage, handleError, withErrorHandling } from '../errorHandler';
import { ApiError } from '../../../services/api/client';
import i18n from '../../../config/i18n';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../config/i18n', () => ({
  default: {
    t: vi.fn((key: string, defaultValue?: string) => defaultValue || key),
    exists: vi.fn(() => false),
  }
}));

describe('errorHandler', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('normalizeError', () => {
        it('debería normalizar un ApiError correctamente', () => {
            const apiError = new ApiError('Not found', 404, { detail: 'User not found' });
            
            const result = normalizeError(apiError);

            expect(result).toEqual({
                message: 'Not found',
                status: 404,
                details: { detail: 'User not found' },
            });
        });

        it('debería normalizar un Error estándar de JavaScript correctamente', () => {
            const jsError = new Error('Random JS Error');
            
            const result = normalizeError(jsError);

            expect(result).toEqual({
                message: 'Random JS Error',
            });
        });

        it('debería normalizar un string como error directamente', () => {
            const result = normalizeError('Just a string error');

            expect(result).toEqual({
                message: 'Just a string error',
            });
        });

        it('debería normalizar un objeto desconocido con un mensaje por defecto', () => {
            vi.mocked(i18n.t).mockReturnValue('Ha ocurrido un error inesperado');
            
            const result = normalizeError({ unexpected: true });

            expect(result).toEqual({
                message: 'Ha ocurrido un error inesperado',
            });
            expect(i18n.t).toHaveBeenCalledWith('errors.unexpected', 'Ha ocurrido un error inesperado');
        });
    });

    describe('getUserFriendlyMessage', () => {
        it('debería retornar un mensaje de error HTTP traducido si existe la clave', () => {
            const apiError = new ApiError('Internal Error', 500);
            vi.mocked(i18n.exists).mockReturnValue(true);
            vi.mocked(i18n.t).mockReturnValue('Error interno del servidor traducido');

            const result = getUserFriendlyMessage(apiError);

            expect(i18n.exists).toHaveBeenCalledWith('errors.status.500');
            expect(i18n.t).toHaveBeenCalledWith('errors.status.500');
            expect(result).toBe('Error interno del servidor traducido');
        });

        it('debería retornar el mensaje normalizado si el código HTTP no tiene traducción', () => {
            const apiError = new ApiError('Unknown Internal Error', 599);
            vi.mocked(i18n.exists).mockReturnValue(false);

            const result = getUserFriendlyMessage(apiError);

            expect(i18n.exists).toHaveBeenCalledWith('errors.status.599');
            expect(i18n.t).not.toHaveBeenCalled();
            expect(result).toBe('Unknown Internal Error');
        });

        it('debería retornar el mensaje normalizado para errores sin status', () => {
            const jsError = new Error('ReferenceError: var is not defined');

            const result = getUserFriendlyMessage(jsError);

            expect(i18n.exists).not.toHaveBeenCalled();
            expect(result).toBe('ReferenceError: var is not defined');
        });
    });

    describe('handleError', () => {
        it('debería registrar el error en consola sin contexto específico', () => {
            const error = new Error('Test Error');
            
            const result = handleError(error);

            expect(console.error).toHaveBeenCalledWith('Error:', { message: 'Test Error' });
            expect(result).toEqual({ message: 'Test Error' });
        });

        it('debería registrar el error en consola con contexto específico', () => {
            const error = new Error('Context Error');
            
            const result = handleError(error, 'AuthModule');

            expect(console.error).toHaveBeenCalledWith('[AuthModule]', { message: 'Context Error' });
            expect(result).toEqual({ message: 'Context Error' });
        });
    });

    describe('withErrorHandling', () => {
        it('debería retornar los datos si la promesa se resuelve', async () => {
            const successfulFn = async () => 'Success Data';

            const [result, error] = await withErrorHandling(successfulFn);

            expect(result).toBe('Success Data');
            expect(error).toBeNull();
        });

        it('debería capturar y retornar el error manipulado si la promesa es rechazada', async () => {
            const failedFn = async () => {
                throw new Error('Async failure');
            };

            const [result, error] = await withErrorHandling(failedFn, 'AsyncContext');

            expect(result).toBeNull();
            expect(error).toEqual({ message: 'Async failure' });
            expect(console.error).toHaveBeenCalledWith('[AsyncContext]', { message: 'Async failure' });
        });
    });
});
