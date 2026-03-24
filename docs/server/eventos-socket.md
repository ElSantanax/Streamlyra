# Catálogo de Eventos de Socket

Esta página documenta todos los eventos del sistema de WebSockets de Streamlyra. Es la **referencia definitiva** para el cliente (frontend): qué eventos escuchar, qué datos contienen, y cuándo se emiten.

> Los eventos fluyen en dos direcciones: el **servidor → cliente** (eventos que el frontend recibe) y el **cliente → servidor** (eventos que el frontend envía).

## Eventos: Cliente → Servidor

Estos son los eventos que el **frontend envía** al servidor.

### `identify`

Registra el socket en la "room" del usuario para recibir eventos personalizados.

```typescript
// Sin payload adicional
socket.emit("identify");
// Respuesta del servidor:
// 'identified' → { userId: string, message: string }
```

### `send_message`

Envía un mensaje desde el dashboard a una o más plataformas.

```typescript
socket.emit('send_message', {
  userId: string,
  message: string,
  platforms: Platform[] // [] = todas las plataformas conectadas
})
// Respuesta del servidor:
// 'message_sent' → SendMessageResponse
// 'message_error' → { code: string, message: string }
```

### `moderation_action`

Aplica una acción de moderación en una plataforma.

```typescript
socket.emit('moderation_action', {
  userId: string,
  platform: 'twitch' | 'kick' | 'youtube' | 'dashboard',
  action: 'delete' | 'ban' | 'timeout',
  messageId?: string,          // Requerido para 'delete'
  targetUserId?: string,
  targetUsername?: string,
  reason?: string,
  duration?: number,           // Segundos (solo 'timeout')
  platformIds?: Record<string, string>
})
// Respuesta del servidor:
// 'moderation_success' → { platform: string, action: string }
// 'moderation_error' → { code: string, message: string }
```

### `youtube_boost_discovery`

Fuerza al servidor a intentar encontrar el stream de YouTube inmediatamente, sin esperar al ciclo automático.

```typescript
socket.emit("youtube_boost_discovery");
// Sin respuesta directa. El servidor emitirá 'connection_status' con el resultado.
```

### `tiktok_boost_discovery`

Igual que el anterior, pero para TikTok.

```typescript
socket.emit("tiktok_boost_discovery");
```

## Eventos: Servidor → Cliente

Estos son los eventos que el **frontend debe escuchar**.

### `chat_message`

El más importante. Se emite cada vez que llega un mensaje de chat de cualquier plataforma, o un evento especial (follow, raid, sub, regalo).

```typescript
socket.on('chat_message', (data: NormalizedChatMessage) => {})

// Estructura de NormalizedChatMessage:
{
  id: string,              // ID único del mensaje
  platform: 'twitch' | 'youtube' | 'kick' | 'tiktok',
  user: string,            // Nombre del usuario
  userId?: string,
  message: string,         // Texto del mensaje (vacío en eventos especiales)
  time: string,            // Hora "HH:MM"
  color: string,           // Color de acento de la plataforma
  avatar?: string,         // Solo YouTube
  isMod?: boolean,
  isSub?: boolean,
  isVIP?: boolean,
  isOwner?: boolean,
  isSpecial?: boolean,     // true en follows, raids, subs, regalos, cofres
  specialMessage?: string, // Ej: "!RAID CON 200 ESPECTADORES!", "🎁 REGALO: 5x Rose", "🧧 COFRE DE TESORO"
  messageId?: string,      // Para acciones de moderación
  roomId?: string,
  emotes?: Array<{
    id: string,
    name: string,
    url: string,
    positions: [number, number][]
  }>,
  bits?: number            // Solo Twitch (cheermotes)
}
```

### `connection_status`

Informa sobre el estado de la conexión a una plataforma específica.

```typescript
socket.on('connection_status', (data) => {})

// Estructura:
{
  platform: 'twitch' | 'youtube' | 'kick' | 'tiktok',
  status: 'connecting' | 'searching' | 'waiting_stream' | 'connected' | 'disconnected' | 'error',
  message?: string,        // Mensaje legible para el usuario (ej: "Sin Live", "Buscando...")
  isLive: boolean,         // ¿Está el streamer en directo en esta plataforma?
  sessionStartTime: string | null, // ISO timestamp de cuando inició el stream
  serverTime: string       // ISO timestamp del servidor
}
```

**Valores de `status`**:
| Estado | Significado |
|-----------------|----------------------------------------------------------|
| `connecting` | El servidor está intentando establecer conexión inicial |
| `searching` | El sistema está buscando activamente una transmisión en vivo |
| `waiting_stream`| Plataforma vinculada pero no hay directo activo (modo espera) |
| `connected` | Conectado y recibiendo eventos del chat en vivo |
| `disconnected` | Cuenta no vinculada o desconexión manual |
| `error` | Ocurrió un error (token expirado, baneo, fallo de red) |

### `viewers_update`

Actualiza el contador de espectadores de una plataforma.

```typescript
socket.on('viewers_update', (data) => {})

// Estructura:
{
  platform: 'twitch' | 'youtube' | 'kick' | 'tiktok',
  count: number,
  isLive: boolean,
  sessionStartTime: string | null,
  serverTime: string
}
```

### `identified`

Confirmación de que el socket fue registrado correctamente.

```typescript
socket.on("identified", (data) => {});
// { userId: string, message: 'Conectado de forma segura' }
```

### `last_follower_update`

Enviado al conectar si hay un último seguidor almacenado (no expirado, < 7 días), para que el dashboard se despierte con datos.

```typescript
socket.on("last_follower_update", (data) => {});
// { name: string, platform: string, at: Date } | null
```

### `last_raid_update`

Igual que el anterior, pero para el último raid.

```typescript
socket.on("last_raid_update", (data) => {});
// { name: string, platform: string, viewers: number, at: Date } | null
```

### `message_sent`

Confirmación de que el mensaje enviado fue procesado.

```typescript
socket.on("message_sent", (data: SendMessageResponse) => {});
// { success: boolean, results: PlatformResult[], timestamp: string }
```

### `message_error`

Cuando el envío de un mensaje falla completamente.

```typescript
socket.on("message_error", (data) => {});
// { code: string, message: string }
```

### `moderation_success`

Confirmación de moderación exitosa.

```typescript
socket.on("moderation_success", (data) => {});
// { platform: string, action: string }
```

### `moderation_error`

Cuando una acción de moderación falla.

```typescript
socket.on("moderation_error", (data) => {});
// { code: string, message: string }
```

### `error`

Error genérico del sistema de sockets.

```typescript
socket.on("error", (data) => {});
// { code: 'SOCKET_ERROR', message: string }
```

## Flujo Típico de Conexión

```
1. Frontend conecta al socket (con cookie JWT)
2. Frontend emite 'identify'
3. Servidor responde 'identified'
4. Servidor emite 'connection_status' para cada plataforma (estado actual)
5. Servidor emite 'last_follower_update' y 'last_raid_update' (si existen)
6. Servidor emite 'chat_message' cada vez que llega un mensaje
7. Servidor emite 'viewers_update' periódicamente
```