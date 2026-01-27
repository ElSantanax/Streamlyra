/**
 * Componentes de utilidad para testing
 */

import type React from 'react';

/**
 * Componente que lanza un error para testing de Error Boundaries
 */
export function ThrowError({ error }: { error?: Error }): React.ReactElement {
  throw error || new Error('Test error');
}
