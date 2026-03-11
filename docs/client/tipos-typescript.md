# Tipos TypeScript

El frontend de Streamlyra está fuertemente tipado para asegurar que los datos fluyan correctamente desde la API hasta los componentes visuales.

## Usuario y Sesión (`user.types.ts`)

Define la estructura del usuario y las respuestas de autenticación.

### `User`
```typescript
interface User {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  overlayToken?: string; // Token único para la fuente de OBS
}
```

### `ConnectionInfo`
Representa el estado y las estadísticas de una plataforma vinculada.
- `connected`: Booleano que indica si la cuenta está vinculada.
- `status`: Estado detallado (`connecting`, `connected`, `error`, etc.).
- `viewers`: Número actual de espectadores en vivo.
- `isLive`: Indica si la transmisión está activa.

---

## Chat y Mensajería (`chat.types.ts`)

Este es el tipo más importante del sistema, ya que normaliza los mensajes de todas las plataformas (Twitch, YouTube, Kick).

### `ChatMessage`
```typescript
interface ChatMessage {
  id?: string;
  user: string;
  message: string;
  time: string;
  platform: PlatformKey; // 'twitch' | 'youtube' | 'kick' | 'tiktok'
  color?: string; // Color preferido del usuario
  isSub?: boolean;
  isMod?: boolean;
  isVIP?: boolean;
  isOwner?: boolean;
  emotes?: Array<{
    id: string;
    name: string;
    url: string;
    positions: Array<[number, number]>;
  }>;
}
```

### `ConnectionStatusUpdate`
Tipo utilizado para las actualizaciones de estado que llegan a través de WebSockets o Polling.

---

## Mensajería Interna (`message.types.ts`)

Define las estructuras para las acciones que el streamer puede realizar desde el dashboard.

- **`DeleteMessageAction`**: Datos necesarios para solicitar el borrado de un mensaje.
- **`BanUserAction`**: Datos para banear o silenciar a un usuario en una plataforma específica.

## Beneficios del Tipado

1.  **Autocompletado**: Los desarrolladores reciben ayuda inmediata al acceder a propiedades de un mensaje de chat.
2.  **Seguridad en Refactor**: Cambiar el nombre de una propiedad en el backend y actualizar el tipo en el frontend señalará todos los componentes que necesitan ser corregidos.
3.  **Normalización**: Gracias a `ChatMessage`, el componente `ChatFeed` no necesita saber si un mensaje viene de Twitch o YouTube; simplemente renderiza las propiedades estándar.
