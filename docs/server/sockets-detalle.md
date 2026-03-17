# Sistema de Sockets en Detalle

## Arquitectura de Socket.IO en Streamlyra

El módulo `src/socket/` está dividido en capas con responsabilidades bien separadas. Ningún handler conoce a los demás; todos se registran de forma independiente.

## Punto de Entrada: `socket.handler.ts`

La función `setupSocketHandlers()` es el bootstrap del sistema de sockets. No maneja ningún evento directamente, su único trabajo es:

1. Instanciar los servicios de moderación.
2. Instanciar los tres handlers especializados.
3. Registrar el middleware de autenticación en Socket.IO.
4. Cuando llega una conexión autenticada, delegar la configuración a cada handler.

```
io.on('connection', socket) → {
  messageHandler.setupHandler(socket)
  moderationHandler.setupHandler(socket)
  connectionHandler.setupHandler(socket)  ← también lanza las conexiones al chat
}
```

## Los Tres Handlers

### 1. `ConnectionSocketHandler.ts`

Gestiona los eventos del ciclo de vida de la conexión.

| Evento recibido           | Acción                                                            |
| ------------------------- | ----------------------------------------------------------------- |
| `identify`                | Registra el socket en la "room" del usuario                       |
| `youtube_boost_discovery` | Fuerza un reintento inmediato para encontrar el stream de YouTube |
| `tiktok_boost_discovery`  | Igual para TikTok                                                 |
| `disconnect`              | Limpia el socket del registro de conexiones                       |

**Bonus**: Al conectar, envía automáticamente al cliente el **último seguidor y raid** almacenados en la BD, para que el dashboard se "despierte" con datos en pantalla.

### 2. `MessageSocketHandler.ts`

Escucha el evento `send_message` del dashboard. Cuando el streamer escribe algo:

1. Valida que el payload sea correcto (usuario, mensaje, plataformas destino).
2. Llama a `MessageSenderService.sendMessage()`.
3. Emite `message_sent` o `message_error` al cliente con el resultado por plataforma.

### 3. `ModerationSocketHandler.ts`

Escucha el evento `moderation_action`. Usa el **Patrón Estrategia** para ejecutar la acción correcta según la plataforma:

| Estrategia                    | Plataforma     |
| ----------------------------- | -------------- |
| `TwitchModerationStrategy`    | Twitch         |
| `KickModerationStrategy`      | Kick           |
| `YouTubeModerationStrategy`   | YouTube        |
| `DashboardModerationStrategy` | Todas a la vez |

Antes de ejecutar, siempre valida:

- Que el `userId` del token de sesión coincida con el del payload.
- Que la plataforma sea soportada.
- Que el payload tenga la estructura correcta (`ModerationValidator`).

## Servicios de Soporte del Socket (`src/socket/services/`)

| Servicio                  | Responsabilidad                                                         |
| ------------------------- | ----------------------------------------------------------------------- |
| `SocketConnectionManager` | Registra y gestiona sockets de las "rooms" de usuario                   |
| `SocketRegistry`          | Mapa en memoria de `socketId → userId` para referencias cruzadas        |
| `SocketLockManager`       | Previene condiciones de carrera al conectar la misma cuenta en paralelo |

## Resiliencia de Conexión: El Periodo de Gracia

Para evitar que una recarga de página o una breve inestabilidad del internet del usuario desconecte todos sus chats de streaming, Streamlyra implementa un **Periodo de Gracia de 60 segundos**.

### Funcionamiento:
1. **Desconexión Accidental**: Cuando el último socket de un usuario se desconecta, el `SocketConnectionManager` inicia un temporizador.
2. **Reconexión Rápida**: Si el usuario vuelve (ej: tras un refresh) y emite un `identify` antes de que pasen los 60s, el temporizador se cancela y las conexiones a los chats (Kick, YouTube, etc.) permanecen intactas.
3. **Expiración**: Si pasan los 60s sin reconexión, se ejecutan todos los destructores de los proveedores de chat para liberar memoria.

### Logout Explícito:
Cuando el usuario presiona "Cerrar Sesión", el cliente emite un evento `logout` **antes** de invalidar la sesión. Esto le indica al servidor que debe omitir el periodo de gracia y desconectar todo de forma inmediata por seguridad.

## Middleware: `SocketAuthMiddleware.ts`

Antes de que cualquier conexión sea aceptada, este middleware verifica el JWT de la cookie de sesión. Si no hay cookie válida, la conexión es rechazada inmediatamente sin llegar a ningún handler.

---

ElSantana
