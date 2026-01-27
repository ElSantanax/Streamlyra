/**
 * Configuración global para fast-check property-based testing
 */

import * as fc from 'fast-check';

/**
 * Parámetros por defecto para property-based tests
 */
export const defaultPropertyTestParams: fc.Parameters<unknown> = {
  numRuns: 100, // Número de iteraciones por test
  verbose: false, // Mostrar detalles solo en caso de fallo
  seed: undefined, // Seed aleatorio (puede especificarse para reproducibilidad)
  path: undefined, // Path para shrinking
  endOnFailure: false, // Continuar con otros tests aunque uno falle
};

/**
 * Helper para ejecutar property tests con configuración por defecto
 */
export function testProperty<Ts extends [unknown, ...unknown[]]>(
  ...args: [...arbitraries: { [K in keyof Ts]: fc.Arbitrary<Ts[K]> }, predicate: (...args: Ts) => boolean | void]
): void {
  const predicate = args[args.length - 1] as (...args: Ts) => boolean | void;
  const arbitraries = args.slice(0, -1) as { [K in keyof Ts]: fc.Arbitrary<Ts[K]> };
  
  fc.assert(
    fc.property(...arbitraries, predicate),
    defaultPropertyTestParams
  );
}

/**
 * Helper para ejecutar property tests asíncronos
 */
export async function testAsyncProperty<Ts extends [unknown, ...unknown[]]>(
  ...args: [...arbitraries: { [K in keyof Ts]: fc.Arbitrary<Ts[K]> }, predicate: (...args: Ts) => Promise<boolean | void>]
): Promise<void> {
  const predicate = args[args.length - 1] as (...args: Ts) => Promise<boolean | void>;
  const arbitraries = args.slice(0, -1) as { [K in keyof Ts]: fc.Arbitrary<Ts[K]> };
  
  await fc.assert(
    fc.asyncProperty(...arbitraries, predicate),
    defaultPropertyTestParams
  );
}
