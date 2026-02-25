/**
 * Tipos relacionados con usuarios
 */

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  overlayToken?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
  connections: Record<string, ConnectionInfo>;
  lastFollower?: LastFollower | null;
  lastRaid?: LastRaid | null;
}

export interface ConnectionStatus {
  connected: boolean;
  username?: string;
  status?: 'connecting' | 'waiting_stream' | 'connected' | 'error' | 'disconnected';
  statusMessage?: string;
  isLive?: boolean;
}

export interface ConnectionStats {
  viewers: number;
  sessionStartTime?: string;
  serverTime?: string;
}

export interface ConnectionInfo extends ConnectionStatus, ConnectionStats { }

export interface LastFollower {
  name: string;
  platform: string;
  at: string;
}

export interface LastRaid {
  name: string;
  platform: string;
  viewers: number;
  at: string;
}

