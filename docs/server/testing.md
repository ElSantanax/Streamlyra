# Testing y Calidad de Código

Streamlyra mantiene un fuerte enfoque en la estabilidad mediante pruebas automatizadas que cubren la lógica de negocio, los controladores y la comunicación en tiempo real.

## Framework de Pruebas

- **Motor Principal**: [Jest](https://jestjs.io/) con `ts-jest` para soporte nativo de TypeScript.
- **Pruebas de API**: Utilización de `supertest` para simular peticiones HTTP y validar respuestas de los controladores.
- **Mocks**: Se utilizan mocks extensivos para las APIs externas (Twitch, YouTube) y la base de datos para asegurar que los tests sean rápidos y deterministas.

## Estructura de los Tests

Los archivos de prueba se encuentran junto al código que prueban, dentro de carpetas `__tests__`:

- **Services**: Ubicados en `src/services/**/__tests__`. Prueban la lógica de negocio pura.
- **Routes/Controllers**: Ubicados en `src/routes/__tests__`. Validan que los endpoints respondan correctamente y manejen errores.
- **Sockets**: Prueban la emisión y recepción de eventos en tiempo real.

## Calidad de Código y Linting en Tests

Para mantener un equilibrio entre seguridad tipográfica y agilidad en el desarrollo de pruebas, la configuración de ESLint en `server/eslint.config.mjs` incluye excepciones específicas para archivos de test (`*.test.ts`, `*.spec.ts`, `**/__tests__/**/*.ts`).

### Reglas Relajadas en Tests

Se han desactivado las siguientes reglas en el entorno de pruebas:

- `@typescript-eslint/no-unsafe-assignment`
- `@typescript-eslint/no-unsafe-member-access`

**¿Por qué?**
Los matchers de Jest como `expect.objectContaining()`, `expect.any()`, y los mocks creados con `jest.fn()` o `jest.spyOn()` a menudo retornan tipos que TypeScript infiere como `any`. Forzar el tipado estricto en estas líneas genera "falsos positivos" que no representan un riesgo real para la estabilidad, sino que dificultan la lectura de los tests.

> [!TIP]
> **Mejor Práctica**: Evita usar `// eslint-disable-next-line` dentro de los archivos de test para estas reglas, ya que la configuración global ya las gestiona. Si encuentras un warning persistente de otro tipo, considera si debe ajustarse globalmente antes de silenciarlo localmente.

## Comandos Útiles

Desde el directorio `server/`:

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo observador (ideal para desarrollo)
npm run test:watch

# Generar reporte de cobertura (Coverage)
npm run test:coverage
```

## Cobertura (Coverage)

Buscamos mantener una cobertura alta en las áreas críticas, especialmente en:

1. **Transformadores de Datos**: Asegurar que los mensajes de diferentes plataformas se normalicen correctamente.
2. **Servicios de Autenticación**: Garantizar que el flujo de OAuth y la gestión de tokens sean seguros.
3. **Manejadores de Sockets**: Validar la autenticación de conexiones y el ruteo de eventos.