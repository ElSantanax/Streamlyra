# Configuración del Servidor

La configuración de Streamlyra es centralizada y tipada, basada en variables de entorno y validada en tiempo de ejecución para prevenir errores de arranque por configuraciones faltantes.

## Módulo de Configuración (`src/config/index.ts`)

Toda la configuración se exporta mediante un objeto único `config`. Este módulo:

1. Carga las variables desde el archivo `.env` mediante `dotenv`.
2. Valida que las variables críticas existan.
3. Exporta constantes estructuradas para el resto de la aplicación.

## Variables de Entorno Requeridas

| Variable         | Descripción                                        | Valor Ejemplo                       |
| :--------------- | :------------------------------------------------- | :---------------------------------- |
| `DATABASE_URL`   | URL de conexión a PostgreSQL.                      | `postgres://user:pass@host:5432/db` |
| `JWT_SECRET`     | Clave para firmar tokens de sesión.                | `una_cadena_larga_y_aleatoria`      |
| `ENCRYPTION_KEY` | Clave para encriptar tokens de terceros (AES-256). | `32_bytes_de_seguridad`             |
| `FRONTEND_URL`   | URL del cliente (CORS).                            | `http://localhost:5173`             |

## Configuración de Cookies y CSRF

Configuramos las cookies de sesión basándonos en el entorno:

- **Producción**: Cookies con `Secure: true`, `SameSite: None` (para permitir cross-site si el dominio es distinto) y `HttpOnly`.
- **Desarrollo**: `Secure: false` y `SameSite: Lax`.

### Configuración CORS para CSRF Cross-Origin

Para soportar aplicaciones donde el frontend y backend están en dominios diferentes (ej. frontend en Vercel, backend en Render), la configuración de CORS incluye:

- **`exposedHeaders: ['X-CSRF-Token']`**: Permite que el cliente JavaScript lea el token CSRF del header de respuesta
- **`allowedHeaders: ['X-CSRF-Token', 'csrf-token']`**: Permite que el cliente envíe el token CSRF en los headers de petición

Esta configuración es esencial para el funcionamiento del sistema de protección CSRF en entornos cross-origin, donde las cookies no son accesibles por JavaScript debido a las políticas de seguridad del navegador.

## Validación en Tiempo de Ejecución

En `src/config/validation.ts`, utilizamos una lógica que detiene el servidor si faltan variables esenciales. Esto evita que la aplicación falle silenciosamente cuando intenta usar un servicio no configurado.

```typescript
// Ejemplo de lógica de validación
if (!process.env.DATABASE_URL) {
  throw new Error("FATAL: DATABASE_URL no definida");
}
```

## Plataformas (OAuth)

La configuración de cada plataforma (IDs de cliente y Secrets) se encuentra desacoplada en `src/config/oauth.config.ts`, permitiendo añadir o modificar integraciones sin tocar el núcleo de la lógica.