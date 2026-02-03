/**
 * Middleware de validación Zod - Valida y transforma datos usando schemas Zod
 */
import { NextFunction, Request, Response } from 'express';
import { z, ZodError } from 'zod';
import { AppError } from '../utils/AppError';

type ZodIssue = z.core.$ZodIssue;

const isMissingFieldIssue = (issue: ZodIssue): boolean => {
    return issue.code === 'invalid_type' &&
        (issue.input === 'undefined' || issue.input === undefined);
};

const formatZodIssue = (issue: ZodIssue): string => {
    const path = issue.path.length > 0 ? z.core.toDotPath(issue.path) : '';

    if (isMissingFieldIssue(issue)) {
        return path ? `${path} es requerido` : 'Campo requerido';
    }

    return path ? `${path}: ${issue.message}` : issue.message;
};

const formatZodError = (error: ZodError): string => {
    const message = error.issues
        .map(formatZodIssue)
        .join(', ');

    return message || 'Body inválido';
};

export const validateZodBody = <T extends z.ZodTypeAny>(schema: T) => {
    return (req: Request, _res: Response, next: NextFunction): void => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const message = formatZodError(result.error);
            return next(new AppError(message, 400));
        }

        req.body = result.data;
        next();
    };
};