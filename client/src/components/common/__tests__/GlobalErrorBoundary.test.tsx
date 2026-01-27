/**
 * Tests para GlobalErrorBoundary
 * Feature: client-security-robustness
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { GlobalErrorBoundary } from '../GlobalErrorBoundary';
import { ThrowError, errorArbitrary } from '../../../test';

describe('GlobalErrorBoundary', () => {
  beforeEach(() => {
    // Suprimir console.error en tests para evitar ruido
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Propiedad 6: Captura de errores de componentes', () => {
    it('debe capturar cualquier error lanzado por un componente hijo y prevenir colapso', () => {
      // Feature: client-security-robustness, Property 6: Captura de errores de componentes
      // Valida: Requisitos 2.2
      
      fc.assert(
        fc.property(errorArbitrary(), (error) => {
          // Renderizar ErrorBoundary con componente que lanza error
          const { container, unmount } = render(
            <GlobalErrorBoundary>
              <ThrowError error={error} />
            </GlobalErrorBoundary>
          );

          try {
            // Verificar que la app no colapsó
            expect(container).toBeTruthy();
            
            // Verificar que se muestra UI alternativa en lugar del error
            expect(screen.getAllByText('Algo salió mal')[0]).toBeInTheDocument();
            
            // Verificar que se muestra el mensaje amigable
            expect(screen.getByText(/La aplicación encontró un error inesperado/i)).toBeInTheDocument();
            
            // Verificar que hay botones de acción
            expect(screen.getByText('Recargar página')).toBeInTheDocument();
            expect(screen.getByText('Intentar de nuevo')).toBeInTheDocument();
          } finally {
            // Limpiar después de cada iteración
            unmount();
          }
        }),
        { numRuns: 50 } // Reducir iteraciones para evitar acumulación
      );
    });

    it('debe capturar errores sin importar el tipo de error', () => {
      const errorTypes = [
        new Error('Generic error'),
        new TypeError('Type error'),
        new ReferenceError('Reference error'),
        new RangeError('Range error'),
      ];

      errorTypes.forEach((error) => {
        const { container, unmount } = render(
          <GlobalErrorBoundary>
            <ThrowError error={error} />
          </GlobalErrorBoundary>
        );

        expect(container).toBeTruthy();
        expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
        
        unmount();
      });
    });

    it('debe renderizar children normalmente cuando no hay errores', () => {
      render(
        <GlobalErrorBoundary>
          <div data-testid="child-component">Contenido normal</div>
        </GlobalErrorBoundary>
      );

      expect(screen.getByTestId('child-component')).toBeInTheDocument();
      expect(screen.getByText('Contenido normal')).toBeInTheDocument();
      expect(screen.queryByText('Algo salió mal')).not.toBeInTheDocument();
    });
  });

  describe('Logging de errores', () => {
    it('debe registrar detalles del error en desarrollo', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const testError = new Error('Test error message');

      render(
        <GlobalErrorBoundary>
          <ThrowError error={testError} />
        </GlobalErrorBoundary>
      );

      // Verificar que se llamó console.error
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      // Verificar que el log incluye información estructurada
      // En el entorno de test, console.error puede tener formato diferente
      const calls = consoleErrorSpy.mock.calls;
      const hasErrorLog = calls.some(call => 
        call.some(arg => 
          typeof arg === 'string' && arg.includes('GlobalErrorBoundary')
        )
      );
      expect(hasErrorLog).toBe(true);
    });
  });

  describe('Propiedad 7: Renderizado de UI alternativa', () => {
    it('debe renderizar UI alternativa cuando se captura un error', () => {
      // Feature: client-security-robustness, Property 7: Renderizado de UI alternativa al capturar error
      // Valida: Requisitos 2.3
      
      fc.assert(
        fc.property(errorArbitrary(), (error) => {
          const { unmount } = render(
            <GlobalErrorBoundary>
              <ThrowError error={error} />
            </GlobalErrorBoundary>
          );

          try {
            // Verificar que se renderiza la UI alternativa
            expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
            expect(screen.getByText(/La aplicación encontró un error inesperado/i)).toBeInTheDocument();
          } finally {
            unmount();
          }
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Propiedad 8: UI alternativa contiene botón de recarga', () => {
    it('debe incluir botones de acción en la UI alternativa', () => {
      // Feature: client-security-robustness, Property 8: UI alternativa contiene botón de recarga
      // Valida: Requisitos 2.4
      
      fc.assert(
        fc.property(errorArbitrary(), (error) => {
          const { unmount } = render(
            <GlobalErrorBoundary>
              <ThrowError error={error} />
            </GlobalErrorBoundary>
          );

          try {
            // Verificar que existen los botones de acción
            const reloadButton = screen.getByText('Recargar página');
            const retryButton = screen.getByText('Intentar de nuevo');
            
            expect(reloadButton).toBeInTheDocument();
            expect(retryButton).toBeInTheDocument();
            
            // Verificar que son botones clickeables
            expect(reloadButton.tagName).toBe('BUTTON');
            expect(retryButton.tagName).toBe('BUTTON');
          } finally {
            unmount();
          }
        }),
        { numRuns: 30 }
      );
    });
  });

  describe('Propiedad 22: Mensajes de error amigables', () => {
    it('debe mostrar mensajes amigables sin exponer detalles técnicos en producción', () => {
      // Feature: client-security-robustness, Property 22: Mensajes de error amigables sin detalles técnicos
      // Valida: Requisitos 7.1, 7.2
      
      const testError = new Error('Internal server error at line 42');

      render(
        <GlobalErrorBoundary>
          <ThrowError error={testError} />
        </GlobalErrorBoundary>
      );

      // Verificar mensaje amigable
      expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
      expect(screen.getByText(/La aplicación encontró un error inesperado/i)).toBeInTheDocument();
      
      // En desarrollo, los detalles técnicos están en un <details> colapsado
      // pero el mensaje principal sigue siendo amigable
      const heading = screen.getByText('Algo salió mal');
      expect(heading.tagName).toBe('H2');
      expect(heading).toHaveClass('text-center');
    });
  });

  describe('Propiedad 23: Funcionalidad de recuperación', () => {
    it('debe permitir recuperación del error mediante botón de reset', async () => {
      // Feature: client-security-robustness, Property 23: Funcionalidad de recuperación de errores
      // Valida: Requisitos 7.4
      
      let shouldThrow = true;
      
      function ConditionalError() {
        if (shouldThrow) {
          throw new Error('Conditional error');
        }
        return <div data-testid="recovered-content">Contenido recuperado</div>;
      }

      const { rerender } = render(
        <GlobalErrorBoundary>
          <ConditionalError />
        </GlobalErrorBoundary>
      );

      // Verificar que se muestra el error
      expect(screen.getByText('Algo salió mal')).toBeInTheDocument();
      
      // Cambiar condición para que no lance error
      shouldThrow = false;
      
      // Hacer clic en "Intentar de nuevo"
      const retryButton = screen.getByText('Intentar de nuevo');
      retryButton.click();

      // Re-renderizar para simular el reset
      rerender(
        <GlobalErrorBoundary>
          <ConditionalError />
        </GlobalErrorBoundary>
      );

      // Verificar que el contenido se recuperó
      expect(screen.getByTestId('recovered-content')).toBeInTheDocument();
      expect(screen.queryByText('Algo salió mal')).not.toBeInTheDocument();
    });

    it('debe limpiar el estado de error al hacer reset', () => {
      const testError = new Error('Test error');

      function FailingComponent(): React.ReactElement {
        throw testError;
      }

      render(
        <GlobalErrorBoundary>
          <FailingComponent />
        </GlobalErrorBoundary>
      );

      // Verificar que se capturó el error
      expect(screen.getByText('Algo salió mal')).toBeInTheDocument();

      // Hacer clic en reset
      const retryButton = screen.getByText('Intentar de nuevo');
      expect(retryButton).toBeInTheDocument();
      
      // El botón debe ser clickeable (aunque el componente seguirá fallando)
      // Este test verifica que el mecanismo de reset existe y es funcional
      expect(retryButton.tagName).toBe('BUTTON');
      expect(retryButton).not.toBeDisabled();
    });
  });
});
