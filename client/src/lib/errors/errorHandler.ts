/**
 * Sistema centralizado de manejo de errores
 * Evita try-catch repetitivos y mensajes inconsistentes
 */

import { ApiError } from '../../services/api/client';

export interface ErrorInfo {
  message: string;
  code?: string;
  status?: number;
  details?: unknown;
}

/**
 * Normaliza diferentes tipos de errores a un formato consistente
 */
export function normalizeError(error: unknown): ErrorInfo {
  // Error de API
  if (error instanceof ApiError) {
    return {
      message: error.message,
      status: error.status,
      details: error.data,
    };
  }

  // Error estándar de JavaScript
  if (error instanceof Error) {
    return {
      message: error.message,
    };
  }

  // Error desconocido
  return {
    message: typeof error === 'string' ? error : 'Ha ocurrido un error inesperado',
  };
}

/**
 * Obtiene un mensaje de error amigable para el usuario
 */
export function getUserFriendlyMessage(error: unknown): string {
  const normalized = normalizeError(error);

  // Mensajes específicos por código de estado HTTP
  if (normalized.status) {
    const statusMessages: Record<number, string> = {
      400: 'Los datos enviados no son válidos',
      401: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente',
      403: 'No tienes permisos para realizar esta acción',
      404: 'El recurso solicitado no existe',
      409: 'Ya existe un recurso con estos datos',
      429: 'Demasiadas solicitudes. Por favor, espera un momento',
      500: 'Error del servidor. Por favor, intenta más tarde',
      503: 'El servicio no está disponible temporalmente',
    };

    return statusMessages[normalized.status] || normalized.message;
  }

  return normalized.message;
}

/**
 * Maneja errores de forma consistente con logging
 */
export function handleError(error: unknown, context?: string): ErrorInfo {
  const normalized = normalizeError(error);

  // Log para debugging
  if (context) {
    console.error(`[${context}]`, normalized);
  } else {
    console.error('Error:', normalized);
  }

  return normalized;
}

/**
 * Wrapper para funciones asíncronas con manejo de errores
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context?: string
): Promise<[T | null, ErrorInfo | null]> {
  try {
    const result = await fn();
    return [result, null];
  } catch (error) {
    const errorInfo = handleError(error, context);
    return [null, errorInfo];
  }
}
