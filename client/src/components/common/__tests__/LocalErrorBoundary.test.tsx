/**
 * Tests para LocalErrorBoundary
 * Feature: client-security-robustness
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as fc from 'fast-check';
import { LocalErrorBoundary } from '../LocalErrorBoundary';
import { ThrowError, errorArbitrary } from '../../../test';

describe('LocalErrorBoundary', () => {
  beforeEach(() => {
    // Suprimir console.error en tests para evitar ruido
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  describe('Propiedad 10: Aislamiento de errores locales', () => {
    it('debe aislar errores solo a la sección afectada sin colapsar otras secciones', () => {
      // Feature: client-security-robustness, Property 10: Aislamiento de errores locales
      // Valida: Requisitos 2.7
      
      fc.assert(
        fc.property(errorArbitrary(), (error) => {
          const { unmount } = render(
            <div>
              <LocalErrorBoundary section="section-1">
                <ThrowError error={error} />
              </LocalErrorBoundary>
              
              <LocalErrorBoundary section="section-2">
                <div data-testid="working-section">Sección funcionando</div>
              </LocalErrorBoundary>
              
              <div data-testid="outside-boundary">Contenido fuera del boundary</div>
            </div>
          );

          try {
            // Verificar que la sección con error muestra UI alternativa
            expect(screen.getByText('Error en esta sección')).toBeInTheDocument();
            
            // Verificar que otras secciones siguen funcionando
            expect(screen.getByTestId('working-section')).toBeInTheDocument();
            expect(screen.getByText('Sección funcionando')).toBeInTheDocument();
            
            // Verificar que contenido fuera del boundary no se afecta
            expect(screen.getByTestId('outside-boundary')).toBeInTheDocument();
            expect(screen.getByText('Contenido fuera del boundary')).toBeInTheDocument();
          } finally {
            unmount();
          }
        }),
        { numRuns: 30 }
      );
    });

    it('debe capturar errores en múltiples secciones independientemente', () => {
      const error1 = new Error('Error in section 1');
      const error2 = new Error('Error in section 2');

      render(
        <div>
          <LocalErrorBoundary section="section-1">
            <ThrowError error={error1} />
          </LocalErrorBoundary>
          
          <LocalErrorBoundary section="section-2">
            <ThrowError error={error2} />
          </LocalErrorBoundary>
          
          <LocalErrorBoundary section="section-3">
            <div data-testid="working-section">Sección 3 OK</div>
          </LocalErrorBoundary>
        </div>
      );

      // Verificar que ambas secciones con error muestran UI alternativa
      const errorMessages = screen.getAllByText('Error en esta sección');
      expect(errorMessages).toHaveLength(2);
      
      // Verificar que la sección sin error sigue funcionando
      expect(screen.getByTestId('working-section')).toBeInTheDocument();
    });
  });

  describe('Propiedad 11: Preservación de estado', () => {
    it('debe preservar el estado de componentes fuera del árbol fallido', () => {
      // Feature: client-security-robustness, Property 11: Preservación de estado fuera del árbol fallido
      // Valida: Requisitos 2.8
      
      const testError = new Error('Test error');

      function ExternalComponent() {
        return <div data-testid="external">Estado externo</div>;
      }

      render(
        <div>
          <ExternalComponent />
          
          <LocalErrorBoundary section="failing-section">
            <ThrowError error={testError} />
          </LocalErrorBoundary>
        </div>
      );

      // Verificar que el componente externo se renderizó y sigue visible
      expect(screen.getByTestId('external')).toBeInTheDocument();
      expect(screen.getByText('Estado externo')).toBeInTheDocument();
      
      // Verificar que el error está aislado en la sección fallida
      expect(screen.getByText('Error en esta sección')).toBeInTheDocument();
      
      // Verificar que ambos componentes coexisten
      const container = screen.getByTestId('external').parentElement;
      expect(container).toContainElement(screen.getByTestId('external'));
      expect(container).toContainElement(screen.getByText('Error en esta sección'));
    });
  });

  describe('UI alternativa local', () => {
    it('debe mostrar UI compacta apropiada para errores locales', () => {
      const testError = new Error('Local error');

      render(
        <LocalErrorBoundary section="test-section">
          <ThrowError error={testError} />
        </LocalErrorBoundary>
      );

      // Verificar elementos de la UI alternativa
      expect(screen.getByText('Error en esta sección')).toBeInTheDocument();
      expect(screen.getByText(/No pudimos cargar este contenido/i)).toBeInTheDocument();
      expect(screen.getByText(/El resto de la aplicación sigue funcionando/i)).toBeInTheDocument();
      
      // Verificar botón de reintentar
      const retryButton = screen.getByText('Reintentar');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton.tagName).toBe('BUTTON');
    });

    it('debe incluir nombre de sección en desarrollo', () => {
      const testError = new Error('Test error');

      render(
        <LocalErrorBoundary section="dashboard-chat">
          <ThrowError error={testError} />
        </LocalErrorBoundary>
      );

      // En desarrollo, debe mostrar el nombre de la sección
      expect(screen.getByText(/Sección: dashboard-chat/i)).toBeInTheDocument();
    });
  });

  describe('Logging de errores locales', () => {
    it('debe registrar errores con contexto de sección', () => {
      const consoleErrorSpy = vi.spyOn(console, 'error');
      const testError = new Error('Test error in section');

      render(
        <LocalErrorBoundary section="test-section">
          <ThrowError error={testError} />
        </LocalErrorBoundary>
      );

      // Verificar que se llamó console.error
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      // Verificar que el log incluye el nombre de la sección
      const calls = consoleErrorSpy.mock.calls;
      const hasSection = calls.some(call => 
        call.some(arg => 
          typeof arg === 'string' && arg.includes('test-section')
        )
      );
      expect(hasSection).toBe(true);
    });
  });

  describe('Renderizado normal', () => {
    it('debe renderizar children normalmente cuando no hay errores', () => {
      render(
        <LocalErrorBoundary section="test-section">
          <div data-testid="child-content">Contenido normal</div>
        </LocalErrorBoundary>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
      expect(screen.getByText('Contenido normal')).toBeInTheDocument();
      expect(screen.queryByText('Error en esta sección')).not.toBeInTheDocument();
    });
  });

  describe('Funcionalidad de recuperación', () => {
    it('debe permitir recuperación mediante botón de reintentar', () => {
      let shouldThrow = true;
      
      function ConditionalError() {
        if (shouldThrow) {
          throw new Error('Conditional error');
        }
        return <div data-testid="recovered">Recuperado</div>;
      }

      const { rerender } = render(
        <LocalErrorBoundary section="test">
          <ConditionalError />
        </LocalErrorBoundary>
      );

      // Verificar error
      expect(screen.getByText('Error en esta sección')).toBeInTheDocument();
      
      // Cambiar condición
      shouldThrow = false;
      
      // Click en reintentar
      const retryButton = screen.getByText('Reintentar');
      retryButton.click();

      // Re-renderizar
      rerender(
        <LocalErrorBoundary section="test">
          <ConditionalError />
        </LocalErrorBoundary>
      );

      // Verificar recuperación
      expect(screen.getByTestId('recovered')).toBeInTheDocument();
      expect(screen.queryByText('Error en esta sección')).not.toBeInTheDocument();
    });
  });
});
