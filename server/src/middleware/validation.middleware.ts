import { Request, Response, NextFunction } from 'express';

export const validateBody = (requiredFields: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        const body = req.body as Record<string, unknown>;
        const missingFields = requiredFields.filter(field => !body[field]);

        if (missingFields.length > 0) {
            res.status(400).json({
                error: `Faltan campos requeridos: ${missingFields.join(', ')}`
            });
            return;
        }

        next();
    };
};
