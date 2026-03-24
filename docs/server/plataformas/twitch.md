# Integración con Twitch

Twitch es la plataforma más completa en Streamlyra. Utilizamos una combinación de **EventSub (Webhooks)** para eventos de servidor y **TMI (Twitch Messaging Interface)** para el chat tradicional, garantizando que no se pierda ninguna interacción.

## Arquitectura de la Integración

### 1. EventSub (Webhooks de Nueva Generación)

A diferencia de los métodos antiguos, usamos los webhooks modernos de Twitch para recibir notificaciones en tiempo real cuando:

- Entra un nuevo mensaje de chat (`channel.chat.message`).
- Alguien sigue al canal (`channel.follow`).
- Se recibe una suscripción o regalo (`channel.subscribe`).
- Comienza un Raid (`channel.raid`).
- El stream cambia de estado (`stream.online` / `stream.offline`).

### 2. Sincronización Inteligente (`TwitchManager`)

El `TwitchManager` es el encargado de que las suscripciones a eventos estén siempre al día.

- Al arrancar el servidor, realiza una **sincronización inicial** para verificar que todas las suscripciones en la API de Twitch coincidan con nuestra base de datos local.
- Detecta si la URL del servidor ha cambiado (útil tras un despliegue) y recrea las suscripciones automáticamente.

## Seguridad en Twitch

- **Secretos Dinámicos**: Cada webhook utiliza un secreto único generado aleatoriamente y almacenado de forma encriptada (`AES-256-GCM`).
- **Verificación de Firma**: El `WebhookController` valida el header `Twitch-Eventsub-Message-Signature` en cada petición entrante para asegurar que realmente provenga de Twitch.

## Flujo de Mensajes

1. **Recepción**: Twitch envía un POST a `/api/webhooks/twitch`.
2. **Validación**: Se verifica la firma HMAC.
3. **Transformación**: El `TwitchEventTransformer` convierte el JSON de Twitch al formato estándar de Streamlyra.
4. **Emisión**: Se envía a través de Sockets al cliente.