import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LocalErrorBoundary, type LocalErrorFallbackProps } from '../LocalErrorBoundary';

const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Local Test Error');
  }
  return <div>Componente Local Renderizado</div>;
};

describe('LocalErrorBoundary', () => {
    beforeEach(() => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('debería renderizar los hijos si no hay error', () => {
        render(
            <LocalErrorBoundary section="TestSection">
                <ThrowError shouldThrow={false} />
            </LocalErrorBoundary>
        );

        expect(screen.getByText('Componente Local Renderizado')).toBeInTheDocument();
        expect(screen.queryByText('Error en esta sección')).not.toBeInTheDocument();
    });

    it('debería renderizar el fallback por defecto si ocurre un error y registrar con la sección', () => {
        render(
            <LocalErrorBoundary section="ChatSection">
                <ThrowError shouldThrow={true} />
            </LocalErrorBoundary>
        );

        expect(screen.getByText('Error en esta sección')).toBeInTheDocument();
        expect(screen.getByText('No pudimos cargar este contenido. El resto de la aplicación sigue funcionando.')).toBeInTheDocument();
        // Al estar en import.meta.env.DEV = true (Vitest default), debería mostrar la sección
        expect(screen.getByText('Sección: ChatSection')).toBeInTheDocument();
        
        expect(console.error).toHaveBeenCalled();
        const calls = vi.mocked(console.error).mock.calls;
        const localErrorCall = calls.find((args) => args[0] && typeof args[0] === 'string' && args[0].includes('LocalErrorBoundary caught error in section "ChatSection":'));
        expect(localErrorCall).toBeDefined();
    });

    it('debería permitir resetear el error y renderizar nuevamente los hijos', () => {
        const { rerender } = render(
            <LocalErrorBoundary section="ReintentarSection">
                <ThrowError shouldThrow={true} />
            </LocalErrorBoundary>
        );

        expect(screen.getByText('Error en esta sección')).toBeInTheDocument();

        rerender(
            <LocalErrorBoundary section="ReintentarSection">
                <ThrowError shouldThrow={false} />
            </LocalErrorBoundary>
        );

        // Presionar botón "Reintentar"
        act(() => {
            screen.getByText('Reintentar').click();
        });

        expect(screen.getByText('Componente Local Renderizado')).toBeInTheDocument();
    });

    it('debería utilizar un fallback local personalizado si se provee', () => {
        const CustomLocalFallback = ({ error, resetError, section }: LocalErrorFallbackProps) => (
            <div>
                <h2>{section} Fallback</h2>
                <p>{error.message}</p>
                <button onClick={resetError}>Reintentar Custom</button>
            </div>
        );

        render(
            <LocalErrorBoundary fallback={CustomLocalFallback} section="ProfileSection">
                <ThrowError shouldThrow={true} />
            </LocalErrorBoundary>
        );

        expect(screen.getByText('ProfileSection Fallback')).toBeInTheDocument();
        expect(screen.getByText('Local Test Error')).toBeInTheDocument();
    });

    it('debería usar "unknown" si no se proporciona `section` prop y ocurre un error', () => {
        render(
            <LocalErrorBoundary>
                <ThrowError shouldThrow={true} />
            </LocalErrorBoundary>
        );

        const calls = vi.mocked(console.error).mock.calls;
        const localErrorCall = calls.find((args) => args[0] && typeof args[0] === 'string' && args[0].includes('LocalErrorBoundary caught error in section "unknown":'));
        expect(localErrorCall).toBeDefined();
    });
});
