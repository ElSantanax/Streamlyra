import { Response } from 'express';

export class ResponseHandler {
    static success(res: Response, data: unknown, status: number = 200) {
        return res.status(status).json(data);
    }

    static error(res: Response, message: string, status: number = 500, error?: unknown) {
        if (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(`[Error] ${message}:`, errorMessage);
        }
        return res.status(status).json({ error: message });
    }

    static unauthorized(res: Response, message: string = 'No autorizado') {
        return this.error(res, message, 401);
    }

    static badRequest(res: Response, message: string) {
        return this.error(res, message, 400);
    }

    static notFound(res: Response, message: string = 'Recurso no encontrado') {
        return this.error(res, message, 404);
    }
}
