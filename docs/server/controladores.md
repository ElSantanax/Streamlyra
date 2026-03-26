# Controladores (Capa de Entrada)

Los controladores en Streamlyra son los responsables de interpretar las peticiones HTTP, llamar a los servicios correspondientes y devolver una respuesta estandarizada al cliente.

## Estructura de Controladores (`src/controllers/`)

### 1. `AuthController.ts`

Gestiona todo el ciclo de vida de la sesión del usuario.

- **Login/Vincular Plataformas**: Recibe el código de OAuth, lo pasa al servicio de flujo de autenticación y devuelve el perfil actualizado. Establece la cookie `auth_token` con el JWT de sesión.
- **Logout**: Limpia las cookies de sesión (`auth_token`) y CSRF (`csrf_token`).
- **Gestión de Perfil**: Endpoint `/me` para que el frontend obtenga los datos del usuario logueado.
- **Overlays**: Regeneración del token secreto para OBS.

> **Nota**: El controlador ya no maneja directamente la generación de tokens CSRF. Esta responsabilidad fue movida completamente al middleware `setCsrfCookie` para evitar duplicación de código y garantizar consistencia en toda la aplicación.

### 2. `WebhookController.ts`

El punto de entrada para los eventos externos.

- **Multicanal**: Recibe eventos de Twitch, YouTube y Kick.
- **Validación Pasiva**: Los controladores asumen que los middlewares ya validaron la seguridad; su trabajo es únicamente pasar el cuerpo del mensaje al `WebhookProcessor`.
- **Manejo de Desafíos**: Responde automáticamente a los retos (challenges) de validación que envían plataformas como YouTube o Twitch para confirmar que el servidor está activo.

## Patrón de Diseño

Todos nuestros controladores siguen el principio de **Inyección de Dependencias**. No instancian sus propios servicios, sino que los reciben en el constructor. Esto facilita enormemente el **Testing Unitario**, permitiendo pasar servicios "ficticios" (mocks) para probar la lógica del controlador aisladamente.