# Transformadores de Mensajes

Los Transformadores son la capa de **normalización** del servidor. Su función es recibir el objeto crudo de cada plataforma (con sus formatos propietarios) y convertirlo en un `NormalizedChatMessage` estandarizado que el resto del sistema y el frontend pueden usar sin preocuparse de la plataforma de origen.

## La Jerarquía de Clases

```
BaseEventTransformer (clase abstracta)
    │
    ├── TwitchEventTransformer
    ├── YouTubeEventTransformer
    ├── KickEventTransformer
    └── TikTokEventTransformer
```

## `BaseEventTransformer.ts`

Define el **contrato** que deben cumplir todos los transformadores mediante métodos abstractos, y provee utilidades compartidas:

| Método / Utilidad             | Descripción                                                    |
| ----------------------------- | -------------------------------------------------------------- |
| `formatTime(date)`            | Formatea una fecha a hora legible (`HH:MM`)                    |
| `normalizeUsername(str)`      | Limpia caracteres no válidos de un nombre de usuario           |
| `createMessageId(prefix, id)` | Genera IDs únicos con formato `plataforma_prefix_id_timestamp` |
| `isValidMessage(msg)`         | Verifica que un mensaje no esté vacío                          |
| `transformMessage()`          | **Abstracto**: Cada plataforma debe implementarlo              |
| `transformSpecialEvent()`     | **Abstracto**: Para eventos como follows, raids, regalos       |

## `TwitchEventTransformer.ts`

Maneja dos fuentes de datos distintas de Twitch:

### `transformChatMessage(tags, message)`

Para mensajes recibidos via TMI (IRC). Parsea las `tags` de IRC:

- Extrae el color del usuario, badges (`mod`, `subscriber`, `vip`, `broadcaster`).
- **Parseo de Emotes**: Convierte el formato de emotes de IRC (`emoteId:start-end`) a objetos con URL de imagen `https://static-cdn.jtvnw.net/emoticons/v2/{id}/default/dark/1.0`.

### `transformEventSubChatMessage(event)`

Para mensajes del nuevo sistema EventSub. Trabaja con `fragments` del mensaje para extraer emotes y **Bits** (donaciones de fragmentos de cheermote).

### Eventos Especiales

| Método                              | Produce                                                 |
| ----------------------------------- | ------------------------------------------------------- |
| `transformEventSubFollow`           | `👤 NUEVO SEGUIDOR`                                     |
| `transformEventSubSubscription`     | `🥳 ¡Nueva Suscripción!` o `🎁 ¡Suscripción de Regalo!` |
| `transformEventSubRaid`             | `🚨 ¡RAID CON {N} ESPECTADORES!`                        |
| `transformEventSubRewardRedemption` | `🎁 CANJEÓ "{reward}" ({puntos} puntos)`                |

**Color de marca**: `#9146FF` (morado Twitch)

## `YouTubeEventTransformer.ts`

Transforma los items de la Lista de Chat de YouTube Live. Un mismo endpoint puede devolver distintos tipos de evento:

| `snippet.type`             | `specialMessage` generado         |
| -------------------------- | --------------------------------- |
| `textMessageEvent`         | _(ninguno, es un mensaje normal)_ |
| `superChatEvent`           | `¡DONACIÓN DE {monto}! 💰`        |
| `newMemberEvent`           | `¡NUEVO MIEMBRO: {nivel}! 💎`     |
| `memberMilestoneChatEvent` | `¡MIEMBRO POR {N} MESES! 🔥`      |
| `membershipGiftingEvent`   | `¡HA REGALADO {N} MEMBRESÍAS! 🎁` |

También parsea los **emotes nativos de YouTube** usando el diccionario en `constants/youtube-emotes.ts`.

**Color de marca**: `#FF0000` (rojo YouTube)

## `KickEventTransformer.ts`

Transforma los payloads del sistema de webhooks y sockets de Kick:

### `transformMessage(payload)`

Extrae datos del objeto `KickChatMessagePayload`.

- **Badges**: Itera sobre `sender.identity.badges` para determinar `isMod`, `isSub`, `isVIP`.
- **Ownership**: Compara `broadcaster.user_id === sender.user_id`.
- **URLs de Emotes**: Construye las URLs desde `https://files.kick.com/emotes/{id}/fullsize`.

### Eventos Especiales

| Método                      | Produce                                         |
| --------------------------- | ----------------------------------------------- |
| `transformSubscription`     | `¡NUEVA SUSCRIPCIÓN! 🥳` o renovación con meses |
| `transformGift`             | `¡REGALÓ {N} SUSCRIPCIONES A LA COMUNIDAD! 🎁`  |
| `transformFollow`           | `👤 NUEVO SEGUIDOR`                             |
| `transformRewardRedemption` | `🎁 CANJEÓ "{reward}" ({puntos} puntos)`        |

**Color de marca**: `#53fc18` (verde Kick)

## `TikTokEventTransformer.ts`

El más peculiar, ya que la librería de comunidad entrega objetos con estructura inconsistente. Por eso implementa `selectDisplayName`:

- Si el `nickname` tiene ≥ 2 caracteres alfanuméricos, lo usa.
- Si no (ej. solo emojis), usa el `uniqueId` en su lugar.

### `transformChatMessage(data)`

- Combina emotes **nativos** de TikTok (del diccionario `constants/tiktok-emotes.ts`) con emotes **personalizados** del stream.
- Si el mensaje está vacío pero hay emotes, sustituye el mensaje por `☺️` para que el frontend tenga algo que mostrar.

### Eventos Especiales

| Método            | Produce                        |
| ----------------- | ------------------------------ |
| `transformGift`   | `🎁 REGALO: {N}x {nombreGift}` |
| `transformFollow` | `👤 NUEVO SEGUIDOR`            |

**Color de marca**: `#FF0050` (rosa/rojo TikTok)

## El Objeto `NormalizedChatMessage`

Todos los transformadores producen este objeto. Es el "lenguaje universal" de Streamlyra:

```typescript
interface NormalizedChatMessage {
  id: string; // ID único del mensaje
  platform: Platform; // 'twitch' | 'youtube' | 'kick' | 'tiktok'
  user: string; // Nombre visible del usuario
  userId?: string; // ID del usuario en la plataforma
  message: string; // Texto del mensaje
  time: string; // Hora formateada "HH:MM"
  color: string; // Color de acento de la plataforma
  avatar?: string; // URL del avatar (solo YouTube)
  isMod?: boolean; // Es moderador
  isSub?: boolean; // Es suscriptor/miembro
  isVIP?: boolean; // Es VIP / verificado
  isOwner?: boolean; // Es el dueño del canal
  isSpecial?: boolean; // Es un evento especial (raid, follow, etc.)
  specialMessage?: string; // Texto descriptivo del evento especial
  messageId?: string; // ID del mensaje para acciones de moderación
  roomId?: string; // ID del canal/sala
  emotes?: Emote[]; // Emotes con posiciones y URLs
  bits?: number; // Bits donados (solo Twitch)
}
```