/**
 * Servicio de autenticación
 * Maneja todas las operaciones relacionadas con auth
 */

import { apiClient } from './client';
import { endpoints } from '../../config/endpoints';
import type { AuthResponse, MeResponse } from '../../types';

export const authService = {
  /**
   * Intercambiar código OAuth por token
   */
  async exchangeCode(
    platform: 'twitch' | 'youtube' | 'kick',
    code: string,
    codeVerifier?: string
  ): Promise<AuthResponse> {
    const endpoint = endpoints.auth[platform];
    const body: Record<string, string> = { code };

    if (codeVerifier) {
      body.code_verifier = codeVerifier;
    }

    return apiClient.post<AuthResponse>(endpoint, body, true);
  },

  /**
   * Obtener información del usuario actual
   */
  async getMe(): Promise<MeResponse> {
    // Importante: este endpoint se usa para bootstrap de sesión.
    // Si el usuario no está autenticado, debe responder 401 sin forzar redirección global.
    return apiClient.get<MeResponse>(endpoints.auth.me, false);
  },

  /**
   * Conectar TikTok por username
   */
  async connectTikTok(username: string): Promise<AuthResponse> {
    return apiClient.post<AuthResponse>(endpoints.auth.tiktok, { username }, true);
  },

  /**
   * Desconectar plataforma
   */
  async disconnectPlatform(provider: string): Promise<void> {
    return apiClient.delete(endpoints.auth.platform, { provider }, true);
  },

  /**
   * Cerrar sesión
   */
  async logout(): Promise<void> {
    return apiClient.post(endpoints.auth.logout, {}, true);
  },

  /**
   * Regenerar token de overlay
   */
  async regenerateOverlayToken(): Promise<{ overlayToken: string }> {
    return apiClient.post<{ overlayToken: string }>(endpoints.auth.regenerateOverlayToken, {}, true);
  },
};
