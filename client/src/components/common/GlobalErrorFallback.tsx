/**
 * GlobalErrorFallback
 * UI alternativa mostrada cuando ocurre un error global
 */

import type { ErrorFallbackProps } from './GlobalErrorBoundary';

export function GlobalErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const handleReload = () => {
    resetError();
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
          <svg 
            className="w-6 h-6 text-red-600" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </div>
        
        <h2 className="mt-4 text-xl font-semibold text-center text-gray-900">
          Algo salió mal
        </h2>
        
        <p className="mt-2 text-sm text-center text-gray-600">
          La aplicación encontró un error inesperado. Por favor, intenta recargar la página.
        </p>
        
        {import.meta.env.DEV && (
          <details className="mt-4 p-3 bg-gray-100 rounded text-xs">
            <summary className="cursor-pointer font-medium text-gray-700">
              Detalles técnicos (solo en desarrollo)
            </summary>
            <pre className="mt-2 whitespace-pre-wrap text-red-600 overflow-auto max-h-40">
              {error.message}
              {error.stack && `\n\n${error.stack}`}
            </pre>
          </details>
        )}
        
        <button
          onClick={handleReload}
          className="mt-6 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Recargar página
        </button>
        
        <button
          onClick={resetError}
          className="mt-2 w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2"
        >
          Intentar de nuevo
        </button>
      </div>
    </div>
  );
}
