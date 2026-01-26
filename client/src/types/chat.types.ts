/**
 * Tipos relacionados con chat y mensajes
 */

import type { PlatformKey } from '../constants/platforms';

export interface ChatMessage {
  id?: string;
  user: string;
  message: string;
  time: string;
  platform: PlatformKey;
  isSub?: boolean;
  isMod?: boolean;
  isVIP?: boolean;
  isOwner?: boolean;
  specialMessage?: string;
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
