export enum YouTubeErrorType {
    QUOTA_EXCEEDED = 'YOUTUBE_QUOTA_EXCEEDED',
    BROADCAST_NOT_FOUND = 'BROADCAST_NOT_FOUND',
    INVALID_TOKEN = 'INVALID_TOKEN',
    UNKNOWN = 'UNKNOWN'
}

export class YouTubeError extends Error {
    constructor(
        public readonly type: YouTubeErrorType,
        message: string,
        public readonly originalError?: unknown
    ) {
        super(message);
        this.name = 'YouTubeError';

        // Mantener el stack trace en lenguajes modernos
        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, YouTubeError);
        }
    }

    static isYouTubeError(err: unknown): err is YouTubeError {
        return err instanceof YouTubeError;
    }
}
