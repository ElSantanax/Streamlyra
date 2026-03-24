# Tipos TypeScript del Servidor

Los tipos de TypeScript son los **contratos de datos** del sistema. Definen la forma exacta que deben tener los objetos que circulan entre capas, garantizando consistencia y seguridad de tipos en tiempo de compilación.

## Tipos Globales (`src/types/index.ts`)

Estos tipos son usados por múltiples módulos del sistema.

### `AuthTokens`

Estructura devuelta por las APIs de OAuth al intercambiar un código por tokens:

```typescript
interface AuthTokens {
  access_token: string; // Token de acceso para llamar a la API
  refresh_token?: string; // Token para renovar (no siempre presente, ej. TikTok)
  expires_in: number; // Segundos hasta que el token caduca
  token_type?: string; // Generalmente 'Bearer'
}
```

### `PlatformProfile`

Perfil normalizado de un usuario en cualquier plataforma:

```typescript
interface PlatformProfile {
  provider: Platform; // 'twitch' | 'youtube' | 'kick' | 'tiktok'
  providerId: string; // ID único del usuario en la plataforma
  providerUsername: string; // Nombre de usuario (login)
  displayName: string; // Nombre visible
  avatarUrl?: string; // URL del avatar
  email?: string; // Email (YouTube)
}
```

### `ConnectionDTO`

Dato transferido para representar una cuenta vinculada. Se usa en respuestas de API hacia el frontend:

```typescript
interface ConnectionDTO {
  id: string;
  userId: string;
  provider: Platform;
  providerId: string;
  providerUsername: string;
  expiryDate: Date;
}
```

### `ChatMessage`

Forma básica de un mensaje de chat. (Para la forma completa con emotes, ver `NormalizedChatMessage` en [Transformadores](/server/transformadores)):

```typescript
interface ChatMessage {
  id: string;
  platform: Platform;
  user: string;
  message: string;
  time: string;
  avatar?: string;
  isMod?: boolean;
  isSub?: boolean;
  isOwner?: boolean;
  specialMessage?: string;
  isSpecial?: boolean;
}
```

### `GlobalConnectionStatus`

Tipo centralizado que define todos los estados posibles de una conexión con una plataforma:

```typescript
type GlobalConnectionStatus = 
  | 'connecting'      // Buscando stream inicial
  | 'searching'       // Buscando stream (sinónimo visual)
  | 'waiting_stream'  // Cuenta vinculada pero sin transmisión activa
  | 'connected'       // Transmisión activa y chat conectado
  | 'error'           // Fallo en la conexión o sesión expirada
  | 'disconnected';   // Cuenta no vinculada
```

### `ConnectionStatus`

Estado de la conexión a una plataforma, usado internamente en buses de eventos:

```typescript
interface ConnectionStatus {
  platform: Platform;
  status: GlobalConnectionStatus;
  message?: string;
}
```

### `ConnectionInfo`

Información completa de estado enviada al frontend vía API (`/me`) y Sockets. Permite que el Dashboard sincronice el estado visual exacto del backend:

```typescript
interface ConnectionInfo {
  connected: boolean;
  username?: string;
  viewers?: number;
  status?: GlobalConnectionStatus;
  statusMessage?: string;
  isLive?: boolean;
  sessionStartTime?: string | null;
}
```

## Tipos de Mensajes (`src/types/message.types.ts`)

Contratos para el envío de mensajes y moderación desde el dashboard.

### `SendMessageRequest`

Lo que el frontend envía al socket cuando el streamer escribe un mensaje:

```typescript
interface SendMessageRequest {
  userId: string;
  message: string;
  platforms: Platform[]; // [] = enviar a todas las plataformas conectadas
}
```

### `SendMessageResponse`

La respuesta que el servidor devuelve con el resultado por plataforma:

```typescript
interface SendMessageResponse {
  success: boolean; // true si al menos una plataforma tuvo éxito
  results: PlatformResult[];
  timestamp: string;
}

interface PlatformResult {
  platform: Platform;
  success: boolean;
  messageId?: string; // ID del mensaje si se envió correctamente
  error?: string; // Descripción del error si falló
  errorCode?: string; // Código de error ('NO_LIVE_BROADCAST', 'QUOTA_EXCEEDED', etc.)
}
```

### `ModerationActionRequest`

Lo que el frontend envía al socket cuando el moderador realiza una acción:

```typescript
interface ModerationActionRequest {
  userId: string; // ID del streamer autenticado
  platform: Platform | "dashboard"; // 'dashboard' = aplicar en todas
  action: "delete" | "ban" | "timeout";
  messageId?: string; // Requerido para 'delete'
  targetUserId?: string; // ID del usuario a moderar
  targetUsername?: string; // Username del usuario (para contexto)
  reason?: string; // Razón del ban/timeout
  duration?: number; // Segundos (solo para 'timeout')
  platformIds?: Record<string, string>; // IDs del usuario en cada plataforma
}
```

## Tipos de Autenticación (`src/types/auth.types.ts`)

### `OAuthService` (Interfaz)

El contrato que deben cumplir todos los servicios de plataforma que soportan OAuth:

```typescript
interface OAuthService {
  getProfileAndTokens(
    code: string,
    codeVerifier?: string,
  ): Promise<{
    profile: PlatformProfile;
    tokens: AuthTokens;
  }>;
  refreshAccessToken(refreshToken: string): Promise<AuthTokens>;
}
```

`TwitchService`, `YouTubeService` y `KickService` implementan esta interfaz. El `PlatformServiceFactory` explota esto para intercambiarlos de forma genérica.