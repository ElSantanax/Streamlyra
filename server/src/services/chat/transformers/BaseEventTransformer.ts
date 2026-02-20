import { NormalizedChatMessage } from './EventTransformer';

export abstract class BaseEventTransformer {
    protected abstract readonly platformName: string;

    protected formatTime(date: Date): string {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    protected createMessageId(prefix: string, identifier: string | number): string {
        return `${this.platformName}_${prefix}_${identifier}_${Date.now()}`;
    }

    protected getCurrentTimestamp(): string {
        return new Date().toISOString();
    }

    protected normalizeUsername(username: string): string {
        return username
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '');
    }

    protected isValidMessage(message: string): boolean {
        return typeof message === 'string' && message.trim().length > 0;
    }

    abstract transformMessage(data: unknown): NormalizedChatMessage;

    abstract transformSpecialEvent(data: unknown): NormalizedChatMessage;
}