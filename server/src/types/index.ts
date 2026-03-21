/**
 * Tipos globales
 * Tipos compartidos entre múltiples módulos
 */

import { Platform } from '../constants/platforms';

export interface AuthTokens {
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type?: string;
}

export interface PlatformProfile {
    provider: Platform;
    providerId: string;
    providerUsername: string;
    displayName: string;
    avatarUrl?: string;
    email?: string;
}

export interface ConnectionDTO {
    id: string;
    userId: string;
    provider: Platform;
    providerId: string;
    providerUsername: string;
    expiryDate: Date;
}

export interface ChatMessage {
    id: string;
    platform: Platform;
    user: string;
    message: string;
    time: string;
    avatar?: string;
    isMod?: boolean;
    isSub?: boolean;
    isOwner?: boolean;
    specialMessage?: string;
    isSpecial?: boolean;
}

export type GlobalConnectionStatus = 'connecting' | 'waiting_stream' | 'connected' | 'error' | 'disconnected' | 'searching';

export interface ConnectionStatus {
    platform: Platform;
    status: 'connecting' | 'connected' | 'disconnected' | 'error';
    message?: string;
}

export interface ViewersUpdate {
    platform: Platform;
    count: number;
}

export interface ConnectionInfo {
    connected: boolean;
    username?: string;
    viewers?: number;
    status?: GlobalConnectionStatus;
    statusMessage?: string;
    isLive?: boolean;
    sessionStartTime?: string | null;
    connectedAt?: string;
}
