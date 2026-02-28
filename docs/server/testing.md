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

---

ElSantana
