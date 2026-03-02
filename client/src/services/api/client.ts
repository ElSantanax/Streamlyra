import { sessionManager } from '../session';
import { env } from '../../config/env';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

class HttpClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const { headers = {}, requiresAuth = false, ...fetchOptions } = options;

    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(headers as Record<string, string>),
    };

    const method = (fetchOptions.method ?? 'GET').toString().toUpperCase();
    const isMutating = method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS';
    if (isMutating) {
      const csrfToken = document.cookie
        .split('; ')
        .find((c) => c.startsWith('csrf_token='))
        ?.split('=')[1];

      if (csrfToken) {
        requestHeaders['X-CSRF-Token'] = decodeURIComponent(csrfToken);
      }
    }

    const url = `${this.baseUrl}${endpoint}`;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers: requestHeaders,
        credentials: 'include', // Importante para HttpOnly cookies
      });

      // Manejar sesión expirada (401) SOLAMENTE si requiere auth
      if (response.status === 401 && requiresAuth) {
        const path = window.location.pathname;
        const isPublicAuthRoute = path === '/login' || path === '/register' || path === '/auth/callback';
        if (!isPublicAuthRoute) {
          sessionManager.handleSessionExpired();
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as { error?: string, message?: string };
        // Priorizar el mensaje del backend si existe
        const errorMessage = errorData.error || errorData.message || `HTTP ${response.status}`;

        throw new ApiError(
          errorMessage,
          response.status,
          errorData
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new ApiError('Network error', 0, error);
    }
  }

  async get<T>(endpoint: string, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', requiresAuth });
  }

  async post<T>(
    endpoint: string,
    data?: unknown,
    requiresAuth = false
  ): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      requiresAuth,
    });
  }

  async delete<T>(endpoint: string, data?: unknown, requiresAuth = false): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: data ? JSON.stringify(data) : undefined,
      requiresAuth,
    });
  }
}

export const apiClient = new HttpClient(env.apiUrl);
