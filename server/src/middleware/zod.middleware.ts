/**
 * Middleware de validación Zod - Valida y transforma datos usando schemas Zod
 */
import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodIssue, ZodSchema } from 'zod';
import { AppError } from '../utils/AppError';

/**
 * Determina si un issue de Zod representa un campo faltante
 */
const isMissingFieldIssue = (issue: ZodIssue): boolean => {
    const issueCode = (issue as unknown as { code?: string }).code;
    const received = (issue as unknown as { received?: unknown }).received;
    const issueMessage = String(issue.message || '');
    
    return issueCode === 'invalid_type' &&
        (received === undefined || 
         received === 'undefined' || 
         /received\s+undefined/i.test(issueMessage));
};

/**
 * Formatea un issue de Zod en un mensaje legible
 */
const formatZodIssue = (issue: ZodIssue): string => {
    const path = issue.path.length > 0 ? String(issue.path.join('.')) : '';

    if (isMissingFieldIssue(issue)) {
        return path ? `${path} es requerido` : 'Campo requerido';
    }

    return path ? `${path}: ${issue.message}` : issue.message;
};

/**
 * Formatea todos los errores de Zod en un mensaje concatenado
 */
const formatZodError = (error: ZodError): string => {
    const message = error.issues
        .map(formatZodIssue)
        .join(', ');
    
    return message || 'Body inválido';
};

/**
 * Middleware factory que valida el body de la petición usando un schema Zod
 */
export const validateZodBody = <T>(schema: ZodSchema<T>) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        try {
            const parsed = schema.parse(req.body);
            req.body = parsed;
            next();
        } catch (err: unknown) {
            if (err instanceof ZodError) {
                const message = formatZodError(err);
                return next(new AppError(message, 400));
            }
            next(err);
        }
    };
};
