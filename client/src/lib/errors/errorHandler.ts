/**
 * Sistema centralizado de manejo de errores
 * Evita try-catch repetitivos y mensajes inconsistentes
 */

import { ApiError } from '../../services/api/client';
import i18n from '../../config/i18n';

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
    message: typeof error === 'string' ? error : i18n.t('errors.unexpected', 'Ha ocurrido un error inesperado'),
  };
}

/**
 * Obtiene un mensaje de error amigable para el usuario
 */
export function getUserFriendlyMessage(error: unknown): string {
  const normalized = normalizeError(error);

  // Mensajes específicos por código de estado HTTP
  if (normalized.status) {
    const translationKey = `errors.status.${normalized.status}`;
    if (i18n.exists(translationKey)) {
      return i18n.t(translationKey) as string;
    }
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
