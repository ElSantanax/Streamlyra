# Estrategias de Testing

Streamlyra utiliza una combinación de pruebas unitarias, de integración y extremo a extremo (E2E) para garantizar la calidad del frontend.

## Pruebas Unitarias e Integración (`Vitest`)

Utilizamos **Vitest** junto con **React Testing Library** para probar componentes individuales y ganchos (hooks).

### Configuración

- **Entorno**: `jsdom` para simular el navegador.
- **Setup**: Configurado en `src/test/setup.ts` para extender los matchers de Jest/Vitest (como `toBeInTheDocument`).
- **Mocks de Sockets**: Se simula el comportamiento de los WebSockets en `services/socket` para que las pruebas sean deterministas.

### Testing con Zustand y Estado Global

Al utilizar **Zustand** para el estado de alta frecuencia, es crucial seguir estas pautas en los tests:

1.  **Mocks de Store**: Se utiliza `vi.mock` para interceptar las llamadas al store. Es importante mockear tanto el hook (`useConnectionsStore`) como sus métodos estáticos como `getState()` si el código bajo prueba los utiliza.
2.  **Limpieza de Estado**: Dado que el estado de Zustand puede persistir entre tests dentro de un mismo archivo, se debe implementar una limpieza sistemática en el ciclo `beforeEach` (ej: llamando a `store.reset()` o `clearMessages()`) para garantizar que cada test sea independiente y no sufra de colisiones de datos.
3.  **Simulación de Selectores**: Los hooks que usan selectores atómicos deben ser testeados proporcionando mocks que devuelvan exactamente el fragmento de estado solicitado para evitar errores de tipo o lógica.

## Pruebas Extreme-to-Extreme (`Cypress`)

Para probar flujos completos de usuario (como el login y la navegación por el dashboard), se utiliza **Cypress**.

- **Base URL**: `http://localhost:5173`
- **Flujos Críticos**:
    - Login exitoso y redirección.
    - Apertura de modales.
    - Cambio de idioma (i18n).

## Comandos de Testing

| Comando | Acción |
| :--- | :--- |
| `npm run test` | Ejecuta las pruebas de vitest una vez. |
| `npm run test:watch` | Ejecuta vitest en modo observación. |
| `npm run test:coverage` | Genera un reporte de cobertura de código. |
| `npm run cypress:open` | Abre la interfaz de Cypress para desarrollo. |
| `npm run cypress:run` | Ejecuta Cypress en modo headless (para CI/CD). |

## Mejores Prácticas

1.  **Priorizar Integración**: Preferimos probar cómo interactúan varios componentes juntos (ej: Sidebar + ChatFeed) en lugar de solo componentes aislados.
2.  **Mocks de API**: Siempre usar mocks para las peticiones de red para que los tests pasen rápido y sin necesidad de un backend levantado.
3.  **Aislamiento de Tests**: Garantizar que el estado global (Zustand) se resetee antes de cada prueba para evitar falsos positivos.