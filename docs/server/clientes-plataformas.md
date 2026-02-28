# Clientes de Plataformas y Factories

Para separar la lógica de negocio de las llamadas HTTP a las APIs externas, Streamlyra cuenta con una capa de **Servicios de Plataforma** (`src/services/platforms/`) que encapsula todas las peticiones a Twitch, YouTube y Kick.

## `PlatformServiceFactory.ts`

Implementa el **Patrón Factory** para los servicios OAuth. Dado un nombre de plataforma, devuelve la instancia del servicio correspondiente. Esto evita que el código que necesita hacer OAuth tenga que preocuparse por cuál clase instanciar.

```typescript
// En vez de:
if (platform === "twitch") new TwitchService().getTokens(code);
if (platform === "youtube") new YouTubeService().getTokens(code);

// Streamlyra usa:
PlatformServiceFactory.getService(platform).getProfileAndTokens(code);
```

## `TwitchService.ts`

Cliente HTTP para la **API Helix de Twitch**. Sus métodos cubren:

- **OAuth**: Intercambio de código por tokens, refresco de tokens.
- **Chat**: `sendChatMessage()` usando la API de chat de Helix.
- **Perfil**: Obtención del `broadcaster_id` y datos del canal.

## `TwitchEventSubClient.ts`

Cliente especializado para gestionar el ciclo de vida de las **suscripciones EventSub**:

- Crear nuevas suscripciones con secreto único.
- Listar todas las suscripciones activas de una cuenta.
- Eliminar suscripciones específicas por ID.
- Este cliente es usado internamente por el `TwitchManager`.

## `YouTubeService.ts`

La fachada principal de YouTube. Agrupa operaciones de alto nivel que combinan múltiples llamadas a la API:

- `getActiveLiveChatId()`: Encuentra el `liveChatId` del stream activo.
- `sendChatMessage()`: Envía un mensaje a un live chat.
- `getProfileAndTokens()`: Intercambio de código OAuth por perfil completo.

### Sub-servicios YouTube (`src/services/platforms/youtube/`)

Para evitar que `YouTubeService.ts` se vuelva un archivo gigante, su lógica está delegada en servicios específicos:

| Archivo                       | Responsabilidad                                        |
| ----------------------------- | ------------------------------------------------------ |
| `YouTubeLiveChatService.ts`   | Envío y lectura de mensajes en el live chat            |
| `YouTubeProfileService.ts`    | Obtención de perfil de usuario y datos del canal       |
| `YouTubeQuotaErrorHandler.ts` | Detección y manejo de errores específicos de cuota     |
| `YouTubeTokenDecoder.ts`      | Decodificación del JWT de Google para obtener el email |

## `KickService.ts`

Cliente para la API beta de Kick. Gestiona:

- Intercambio de código OAuth (PKCE) por tokens.
- Envío de mensajes al chat.
- Obtención de información del canal (`broadcasterId`, `slug`, estado en vivo).

## `YouTubeQuotaManager.ts`

Singleton que controla el consumo diario de la API de YouTube Data v3. El límite es de **10,000 unidades/día**. Sus funciones principales:

- `hasQuota(cost)`: Pregunta si hay cuota disponible antes de una operación.
- `consumeQuota(units)`: Descuenta unidades después de una llamada exitosa.
- `markAsExhausted()`: Bloquea operaciones no urgentes por 15-60 minutos.
- `getAdaptiveInterval()`: Devuelve el intervalo de polling recomendado según la cuota restante.

> **Nota de desarrollo**: En entorno `development`, `hasQuota()` siempre devuelve `true`, para no bloquear el trabajo local por límites de cuota.

---

ElSantana
