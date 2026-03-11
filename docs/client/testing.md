# Estrategias de Testing

Streamlyra utiliza una combinación de pruebas unitarias, de integración y extremo a extremo (E2E) para garantizar la calidad del frontend.

## Pruebas Unitarias e Integración (`Vitest`)

Utilizamos **Vitest** junto con **React Testing Library** para probar componentes individuales y ganchos (hooks).

### Configuración

- **Entorno**: `jsdom` para simular el navegador.
- **Setup**: Configurado en `src/test/setup.ts` para extender los matchers de Jest/Vitest (como `toBeInTheDocument`).
- **Mocks**: Se simulan las llamadas a la API y el comportamiento de los WebSockets para que las pruebas sean deterministas.

### Pruebas de Propiedades (`Fast-Check`)

Para casos complejos o críticos, utilizamos **Fast-Check** para realizar pruebas basadas en propiedades (Property-Based Testing). Esto nos permite generar cientos de combinaciones de datos aleatorios para encontrar errores sutiles que las pruebas manuales no verían.

- **Generadores**: Ubicados en `src/test/generators.ts`, crean datos aleatorios de usuarios, mensajes y estados de conexión.

---

## Pruebas Extreme-to-Extreme (`Cypress`)

Para probar flujos completos de usuario (como el login y la navegación por el dashboard), se utiliza **Cypress**.

- **Base URL**: `http://localhost:5173`
- **Flujos Críticos**:
    - Login exitoso y redirección.
    - Apertura de modales.
    - Cambio de idioma (i18n).

---

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
3.  **Local Error Boundaries**: Tenemos tests específicos para comprobar que la aplicación no se rompe totalmente si un componente hijo falla.
