import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GlobalErrorBoundary, type ErrorFallbackProps } from '../GlobalErrorBoundary';

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test Error from Component');
  }
  return <div>Componente Renderizado</div>;
};



describe('GlobalErrorBoundary', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('debería renderizar los hijos si no hay error', () => {
        render(
            <GlobalErrorBoundary>
                <ThrowError shouldThrow={false} />
            </GlobalErrorBoundary>
        );

        expect(screen.getByText('Componente Renderizado')).toBeInTheDocument();
    });

    it('debería renderizar el fallback por defecto y atrapar el error', () => {
        render(
            <GlobalErrorBoundary>
                <ThrowError shouldThrow={true} />
            </GlobalErrorBoundary>
        );

        expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
        expect(screen.getByText('La aplicación encontró un error inesperado. Por favor, intenta recargar la página.')).toBeInTheDocument();
        expect(console.error).toHaveBeenCalled();
    });

    it('debería permitir resetear el error y volver a intentar renderizar los hijos', () => {
        const { rerender } = render(
            <GlobalErrorBoundary>
                <ThrowError shouldThrow={true} />
            </GlobalErrorBoundary>
        );

        expect(screen.getByText('Algo salió mal')).toBeInTheDocument();

        // Simulamos recuperación primero
        rerender(
            <GlobalErrorBoundary>
                <ThrowError shouldThrow={false} />
            </GlobalErrorBoundary>
        );

        // Aún muestra el fallback
        expect(screen.getByText('Algo salió mal')).toBeInTheDocument();

        // Presionar el botón para resetear el error
        act(() => {
            screen.getByText('Intentar de nuevo').click();
        });

        expect(screen.getByText('Componente Renderizado')).toBeInTheDocument();
    });

    it('debería utilizar un fallback personalizado si se provee', () => {
        const CustomFallback = ({ error, resetError }: ErrorFallbackProps) => (
            <div>
                <h1>Personalizado Fallback Renderizado</h1>
                <p>{error.message}</p>
                <button onClick={resetError}>Recuperar Custom</button>
            </div>
        );

        render(
            <GlobalErrorBoundary fallback={CustomFallback}>
                <ThrowError shouldThrow={true} />
            </GlobalErrorBoundary>
        );

        expect(screen.getByText('Personalizado Fallback Renderizado')).toBeInTheDocument();
        expect(screen.getByText('Test Error from Component')).toBeInTheDocument();
    });
});
