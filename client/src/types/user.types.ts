/**
 * Tipos relacionados con usuarios
 */

export interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface MeResponse {
  user: User;
  connections: Record<string, ConnectionInfo>;
}

export interface ConnectionInfo {
  connected: boolean;
  username?: string;
  viewers?: number;
  status?: 'connecting' | 'connected' | 'error';
  statusMessage?: string;
}
