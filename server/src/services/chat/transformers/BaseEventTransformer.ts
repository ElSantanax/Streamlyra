/**
 * Transformador Base de Eventos
 * Responsabilidad: Proporcionar métodos comunes para transformación de eventos
 * 
 * Cada plataforma (Twitch, YouTube, Kick, TikTok) extiende esta clase
 * y solo implementa métodos específicos de su estructura de eventos
 */

import { NormalizedChatMessage } from './EventTransformer';

/**
 * Clase base abstracta para transformadores de eventos
 * 
 * Métodos genéricos:
 * - formatTime(date) - Formatea fecha a hora legible
 * - createMessageId(prefix, data) - Crea ID único para mensaje
 * 
 * Métodos abstractos (implementar en subclases):
 * - transformMessage(data) - Transforma mensaje de chat
 * - transformSpecialEvent(data) - Transforma evento especial (suscripción, regalo, etc)
 */
export abstract class BaseEventTransformer {
    protected abstract readonly platformName: string;

    /**
     * Formatea fecha a hora legible (HH:MM)
     * 
     * Método común para todas las plataformas
     */
    protected formatTime(date: Date): string {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    /**
     * Crea ID único para mensaje
     * 
     * Formato: {platform}_{type}_{identifier}_{timestamp}
     */
    protected createMessageId(prefix: string, identifier: string | number): string {
        return `${this.platformName}_${prefix}_${identifier}_${Date.now()}`;
    }

    /**
     * Obtiene timestamp actual en formato ISO
     */
    protected getCurrentTimestamp(): string {
        return new Date().toISOString();
    }

    /**
     * Normaliza nombre de usuario (elimina caracteres especiales)
     */
    protected normalizeUsername(username: string): string {
        return username
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, '');
    }

    /**
     * Valida que un mensaje tenga contenido
     */
    protected isValidMessage(message: string): boolean {
        return typeof message === 'string' && message.trim().length > 0;
    }

    /**
     * Método abstracto: Transformar mensaje de chat
     * 
     * Cada plataforma implementa esto según su estructura
     */
    abstract transformMessage(data: unknown): NormalizedChatMessage;

    /**
     * Método abstracto: Transformar evento especial
     * 
     * Cada plataforma implementa esto según su estructura
     */
    abstract transformSpecialEvent(data: unknown): NormalizedChatMessage;
}
