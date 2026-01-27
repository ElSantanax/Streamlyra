/**
 * LocalErrorBoundary
 * Captura errores en secciones específicas de la aplicación
 * Aísla fallos sin afectar el resto de la app
 */

import React from 'react';
import { LocalErrorFallback } from './LocalErrorFallback';

export interface LocalErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<LocalErrorFallbackProps>;
  section?: string; // Nombre de la sección para logging
}

interface LocalErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export interface LocalErrorFallbackProps {
  error: Error;
  errorInfo: React.ErrorInfo;
  resetError: () => void;
  section?: string;
}

export class LocalErrorBoundary extends React.Component<
  LocalErrorBoundaryProps,
  LocalErrorBoundaryState
> {
  constructor(props: LocalErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<LocalErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const section = this.props.section || 'unknown';
    
    // Logging estructurado con contexto de sección
    if (import.meta.env.DEV) {
      console.error(`LocalErrorBoundary caught error in section "${section}":`, {
        section,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack,
        },
        errorInfo: {
          componentStack: errorInfo.componentStack,
        },
        timestamp: new Date().toISOString(),
        path: window.location.pathname,
      });
    }

    // TODO: Integrar con servicio de logging externo en producción
    // logErrorToService(error, errorInfo, { section });

    this.setState({ errorInfo });
  }

  resetError = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || LocalErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          errorInfo={this.state.errorInfo!}
          resetError={this.resetError}
          section={this.props.section}
        />
      );
    }

    return this.props.children;
  }
}
