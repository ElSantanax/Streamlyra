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
}

export interface ViewersUpdate {
  platform: string;
  count: number;
}

export interface ConnectionStatusUpdate {
  platform: string;
  status: 'connecting' | 'connected' | 'error';
  message?: string;
}
