# Webhooks: Procesamiento de Eventos

Cuando una plataforma externa (Twitch, YouTube, Kick) quiere notificar a Streamlyra sobre un evento (un nuevo seguidor, un mensaje de chat, etc.), lo hace enviando un HTTP POST a nuestro servidor. Este proceso se llama **Webhook**.

## Flujo Completo de un Webhook

```
Twitch/YouTube/Kick
      │
      ▼ HTTP POST /api/webhooks/{plataforma}
[Middleware de Validación]
  ├─ twitch.middleware.ts → Verifica HMAC-SHA256
  ├─ youtube.middleware.ts → Verifica firma / responde challenge
  └─ kick.middleware.ts → Verifica firma
      │
      ▼ (Solo si la firma es válida)
[WebhookController]
  └─ Llama a WebhookProcessor
      │
      ▼
[WebhookProcessor]
  └─ WebhookProcessorFactory.getProcessor(plataforma)
      │
      ▼
[Procesador Específico]
  ├─ TwitchWebhookProcessor
  ├─ YouTubeWebhookProcessor
  └─ KickWebhookProcessor
      │
      ▼ (Identifica usuario, transforma evento, emite por Socket)
[SafeSocketEmitter]
  └─ io.to(userId).emit('chat_message' / 'alert' / ...)
```

## `WebhookProcessorFactory.ts`

Aplica el **Patrón Factory**: dado el nombre de una plataforma, devuelve el procesador correcto. Esto permite añadir nuevas plataformas en el futuro sin modificar la lógica central.

## Procesadores Específicos (`src/services/webhook/processors/`)

### `TwitchWebhookProcessor.ts`

- Maneja todos los tipos de eventos de EventSub: `channel.chat.message`, `channel.follow`, `channel.subscribe`, `channel.raid`, `stream.online`, `stream.offline`.
- Busca en la BD a qué usuario pertenece el `broadcasterUserId` del evento.
- Llama al `TwitchEventTransformer` para normalizar el payload.

### `YouTubeWebhookProcessor.ts`

- Recibe el XML de PubSubHubbub de YouTube.
- Usa `YouTubePubSubParser` para extraer el `channelId` y el `videoId`.
- Si el canal tiene un stream activo en nuestro sistema, actualiza el contexto y/o dispara el inicio del poller.

### `KickWebhookProcessor.ts`

- Procesa los eventos de chat y alertas de Kick.
- Extrae el `broadcasterId` para identificar al usuario.
- Transforma el payload al formato normalizado de Streamlyra.

## Optimización de Logs y Monitoreo

Para evitar la saturación de la consola del servidor durante directos con mucho tráfico (mensajes de chat constantes), Streamlyra utiliza niveles de log diferenciados:

- **Nivel `info`**: Reservado para eventos estructurales críticos:
  - Cambio de estado del stream (Online/Offline).
  - Errores de cuota de API.
  - Inicio de servicios o tareas programadas.
- **Nivel `debug`**: Utilizado para el procesamiento individual de cada mensaje de chat.
  - Permite la trazabilidad total en desarrollo o auditoría (`DEBUG=true`).
  - Mantiene la consola de producción limpia y legible centrándose solo en la salud del sistema.

## Tareas Programadas (`src/services/cron/`)

### `YouTubeSubscriptionRenewer.ts`

YouTube exige que las suscripciones de PubSubHubbub se renueven periódicamente (normalmente expiran en 5 días). Este cronjob se ejecuta todos los días a las **04:00 AM** para:

1. Buscar suscripciones próximas a expirar (en las próximas 2 horas).
2. Renovarlas una por una (con 500ms de espera entre cada una para no saturar la API).
3. Reportar cuántas se renovaron exitosamente y cuántas fallaron.