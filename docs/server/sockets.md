# Comunicación en Tiempo Real (WebSockets)

Streamlyra utiliza **Socket.io** como motor principal para la comunicación bidireccional entre el servidor y el cliente. Esto permite que los mensajes de chat, alertas y cambios de estado se reflejen instantáneamente sin necesidad de recargar la página.

## Arquitectura de Sockets

La lógica de Sockets se organiza de forma modular para mantener el código limpio y escalable:

### 1. Manejador Principal (`/socket/socket.handler.ts`)

Es el punto de entrada que configura el servidor de Sockets. Aquí se:

- Instancian los servicios necesarios.
- Separa la lógica en manejadores específicos (Handlers).
- Define la conexión y desconexión global.

### 2. Autenticación y Seguridad

Antes de permitir una conexión, el servidor utiliza un **Middleware de Autenticación** (`SocketAuthMiddleware.ts`).

- Verifica la identidad del usuario (generalmente mediante tokens o sesión).
- Asocia el `userId` al socket para asegurar que el usuario solo reciba o envíe datos que le corresponden.

### 3. Categorías de Handlers (`/socket/handlers`)

Para evitar un archivo de socket gigante, dividimos la responsabilidad en:

- **MessageSocketHandler**: Gestiona el envío y recepción de mensajes de chat.
- **ModerationSocketHandler**: Maneja acciones de moderación como bans, timeouts y eliminación de mensajes.
- **ConnectionSocketHandler**: Controla el estado de las plataformas (conectar/desconectar Twitch, etc.).

## Eventos Principales

### Servidor a Cliente (Emisión)

| Evento               | Descripción                                                               |
| :------------------- | :------------------------------------------------------------------------ |
| `chat:message`       | Se emite cuando llega un nuevo mensaje de cualquier plataforma conectada. |
| `platform:status`    | Notifica cambios en el estado de conexión de una red social.              |
| `alert:notification` | Envía alertas especiales (Follows, Subs, Raids).                          |

### Cliente a Servidor (Escucha)

| Evento            | Descripción                                                                 |
| :---------------- | :-------------------------------------------------------------------------- |
| `chat:send`       | El cliente envía un mensaje para ser publicado en una o varias plataformas. |
| `mod:action`      | Solicitud de moderación sobre un usuario específico.                        |
| `platform:toggle` | Comando para iniciar o detener la escucha de una plataforma.                |

## Mejores Prácticas en Streamlyra

1. **Eficiencia**: Solo emitimos datos a los usuarios que tienen las plataformas correspondientes conectadas.
2. **Normalización**: El cliente siempre recibe el mismo formato de objeto `Message`, sin importar si proviene de Twitch o YouTube.
3. **Resiliencia**: El `SocketConnectionManager` se asegura de que los `ChatProviders` se activen o desactiven correctamente según la presencia de clientes conectados.

---

ElSantana
