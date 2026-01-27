/**
 * LocalErrorFallback
 * UI alternativa compacta para errores locales
 */

import type { LocalErrorFallbackProps } from './LocalErrorBoundary';

export function LocalErrorFallback({ resetError, section }: LocalErrorFallbackProps) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start">
        <div className="shrink-0">
          <svg 
            className="h-5 w-5 text-red-400" 
            viewBox="0 0 20 20" 
            fill="currentColor"
          >
            <path 
              fillRule="evenodd" 
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
              clipRule="evenodd" 
            />
          </svg>
        </div>
        <div className="ml-3 flex-1">
          <h3 className="text-sm font-medium text-red-800">
            Error en esta sección
          </h3>
          <div className="mt-1 text-xs text-red-600">
            <p>
              No pudimos cargar este contenido. El resto de la aplicación sigue funcionando.
            </p>
            {section && import.meta.env.DEV && (
              <p className="mt-1 text-red-500">
                Sección: {section}
              </p>
            )}
          </div>
          <div className="mt-3">
            <button
              onClick={resetError}
              className="text-xs font-medium text-red-700 hover:text-red-900 underline focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-red-50 rounded"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
