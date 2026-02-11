import { NormalizedChatMessage } from './EventTransformer';

// Clase base para normalización de eventos: define la estructura para Twitch, YouTube, Kick y TikTok
export abstract class BaseEventTransformer {
    protected abstract readonly platformName: string;

    // Formatea fecha a HH:MM legible
    protected formatTime(date: Date): string {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Genera ID único: {platform}_{prefix}_{id}_{timestamp}
    protected createMessageId(prefix: string, identifier: string | number): string {
        return `${this.platformName}_${prefix}_${identifier}_${Date.now()}`;
    }

    protected getCurrentTimestamp(): string {
        return new Date().toISOString();
    }

    // Limpia username: minúsculas y remueve caracteres especiales (mantiene _ y -)
    protected normalizeUsername(username: string): string {
        return username
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '');
    }

    protected isValidMessage(message: string): boolean {
        return typeof message === 'string' && message.trim().length > 0;
    }

    // Transforma el payload crudo de la plataforma a mensaje normalizado
    abstract transformMessage(data: unknown): NormalizedChatMessage;

    // Transforma eventos de sistema (subs, donaciones, etc.) a formato común
    abstract transformSpecialEvent(data: unknown): NormalizedChatMessage;
}