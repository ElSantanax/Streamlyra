/**
 * Middleware de validación Zod - Valida y transforma datos usando schemas Zod
 */
import { NextFunction, Request, Response } from 'express';
import { ZodError, ZodSchema } from 'zod';
import { AppError } from '../utils/AppError';

export const validateZodBody = <T>(schema: ZodSchema<T>) => {
    return (req: Request, _res: Response, next: NextFunction) => {
        try {
            const parsed = schema.parse(req.body);
            req.body = parsed;
            next();
        } catch (err: unknown) {
            if (err instanceof ZodError) {
                const message = err.issues
                    .map(issue => {
                        const path = issue.path.length > 0 ? String(issue.path.join('.')) : '';

                        const issueCode = (issue as unknown as { code?: string }).code;
                        const received = (issue as unknown as { received?: unknown }).received;
                        const issueMessage = String(issue.message || '');
                        const isMissingField =
                            issueCode === 'invalid_type' &&
                            (received === undefined || received === 'undefined' || /received\s+undefined/i.test(issueMessage));

                        if (isMissingField) {
                            return path ? `${path} es requerido` : 'Campo requerido';
                        }

                        return path ? `${path}: ${issue.message}` : issue.message;
                    })
                    .join(', ');
                throw new AppError(message || 'Body inválido', 400);
            }
            throw err;
        }
    };
};
