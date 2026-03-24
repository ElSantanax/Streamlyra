# Manejo de Errores y Logging

En Streamlyra, el manejo de errores está centralizado para garantizar que el servidor nunca se detenga ante fallos inesperados y que el cliente siempre reciba una respuesta coherente.

## Manejo de Errores

### Clase `AppError`

Utilizamos una clase personalizada (`src/utils/AppError.ts`) que extiende de `Error`. Esta clase nos permite adjuntar metadatos adicionales como:

- `statusCode`: El código HTTP que se debe devolver (ej. 404, 401, 500).
- `isOperational`: Indica si es un error controlado (como una validación fallida) o un error de programación inesperado.

### Middleware Global de Errores

Ubicado en `src/middleware/error.middleware.ts`, este middleware intercepta cualquier error lanzado en las rutas o servicios:

- **Logging Inteligente**: Registra errores `500` con prioridad `ERROR` y errores controlados (como `400`) con prioridad `WARN`.
- **Formateo**: Devuelve un JSON estandarizado al cliente.
- **Seguridad en Producción**: Oculta el _stack trace_ en entornos de producción para no exponer detalles internos del código, mostrándolo únicamente en desarrollo.

## Sistema de Logging (Pino)

Utilizamos **Pino** como motor de logging debido a su bajo consumo de recursos y su capacidad para generar registros en formato JSON, ideales para herramientas de análisis de logs.

- **Servicio**: `src/utils/logger.ts`.
- **Salida**: En desarrollo, utilizamos `pino-pretty` para que los logs sean legibles por humanos en la terminal. En producción, se emiten en JSON puro para una mayor eficiencia.

### Niveles de Log aplicados:

- `info`: Arranque del servidor, conexiones de base de datos exitosas, eventos de sistema.
- `warn`: Fallos de autenticación, CSRF inválidos, errores de validación (Zod).
- `error`: Fallos en llamadas a APIs externas, errores de conexión a la DB, excepciones no controladas.
- `fatal`: Errores críticos que impiden el funcionamiento (ej. configuración corrupta).