# Guía Detallada de Servicios (Sub-módulos)

Esta página profundiza en los servicios secundarios pero esenciales que permiten el funcionamiento fluido de Streamlyra, desde el envío de mensajes hasta la moderación y analíticas.

## Gestión de Mensajes de Salida (`src/services/message`)

### `MessageSenderService.ts`

Es el orquestador del envío de mensajes desde el dashboard hacia las plataformas.

- **Multi-envío**: Si el usuario escribe un mensaje, este servicio puede replicarlo simultáneamente en Twitch, YouTube y Kick.
- **Caché Anti-Eco**: Utiliza `sentMessageCache` para marcar un mensaje como enviado por el propio sistema. Esto evita que, cuando el Webhook recibe el mensaje de vuelta desde la plataforma, el sistema lo procese como un mensaje nuevo del usuario, evitando bucles infinitos.
- **Reintentos Inteligentes**: Delegado al `PlatformSendHelper`, que maneja la actualización de tokens de acceso si el envío falla por expiración de sesión.

---

## Servicios de Moderación (`src/services/moderation`)

Implementan acciones administrativas unificadas para todas las plataformas.

- **`TwitchModerationService.ts`**: Utiliza la API Helix para banear usuarios, silenciarlos (timeouts) o borrar mensajes específicos.
- **`YouTubeModerationService.ts`**: Gestiona las acciones de moderación de Google. Es especialmente cuidadoso con el uso de cuotas (cada ban consume 50 unidades).
- **`KickModerationService.ts`**: Realiza peticiones a los endpoints de moderación de Kick para mantener el chat limpio.

---

## Servicios de Usuario y Conexión (`src/services/user` & `/connection`)

- **`UserService.ts`**: Gestiona la creación de perfiles, la obtención de datos del usuario autenticado y la regeneración de tokens para overlays de OBS.
- **`ConnectionService.ts`**: Es el responsable de interactuar con el `ConnectionRepository`. Provee métodos de alto nivel para obtener tokens válidos, refrescar sesiones OAuth y verificar qué cuentas tiene vinculadas un usuario.

---

## Procesamiento de Eventos (`src/services/webhook`)

### `WebhookProcessor.ts`

Una vez que un middleware valida que un Webhook es legítimo, el `WebhookProcessor` toma el relevo:

1. **Identificación**: Determina a qué usuario pertenece el evento basándose en el ID de plataforma.
2. **Transformación**: Llama al Transformer adecuado para normalizar los datos.
3. **Distribución**: Envía el evento al portal (vía Sockets) para que el streamer vea la notificación o mensaje al instante.

---

## Otros Servicios

- **`AnalyticsService.ts`**: Recolecta métricas de uso de la plataforma para generar estadísticas en el dashboard del usuario.
- **`YouTubeSubscriptionRenewer.ts`**: Un servicio de fondo (Cron) que despierta cada madrugada para renovar las suscripciones de YouTube (PubSub), evitando que caduquen silenciosamente.

---

ElSantana
