/**
 * Tipos relacionados con chat y mensajes
 */

import type { PlatformKey } from '../constants/platforms';

export type MessageStatus = 'sending' | 'sent' | 'error';

export interface ChatMessage {
  id?: string;
  user: string;
  message: string;
  time: string;
  platform: PlatformKey;
  color?: string;
  isSub?: boolean;
  isMod?: boolean;
  isVIP?: boolean;
  isOwner?: boolean;
  specialMessage?: string;
  status?: MessageStatus; // Estado del mensaje (solo para mensajes propios)
  errorMessage?: string; // Mensaje de error si falló
  bits?: number; // Donación de bits (Twitch)
  platformIds?: Record<string, string>; // IDs específicos de cada plataforma para mensajes dashboard
  // Campos adicionales para moderación
  userId?: string; // ID del usuario que envió el mensaje
  roomId?: string; // ID del canal/room
  // Emotes para renderizado visual
  emotes?: Array<{
    id: string;
    name: string;
    url: string;
    positions: Array<[number, number]>; // [inicio, fin] en el texto original
  }>;
}

export interface ViewersUpdate {
  platform: string;
  count: number;
  isLive?: boolean;
  sessionStartTime?: string;
  serverTime?: string;
}

export interface ConnectionStatusUpdate {
  platform: string;
  status: 'connecting' | 'waiting_stream' | 'connected' | 'error' | 'disconnected';
  message?: string;
  isLive?: boolean;
  sessionStartTime?: string;
  serverTime?: string;
}
