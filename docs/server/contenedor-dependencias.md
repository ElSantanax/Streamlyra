# Contenedor de Dependencias

El archivo `src/services/container.ts` es el **corazón de la arquitectura** del servidor. Aplica el patrón de **Inyección de Dependencias (DI)** de forma manual y centralizada: en lugar de que cada clase cree sus propias dependencias, todas se construyen aquí en el orden correcto y se pasan hacia abajo.

## ¿Por qué un Contenedor?

Sin un contenedor, los servicios tendrían que instanciar sus propias dependencias, generando:

- **Acoplamiento Fuerte**: Difícil de testear porque no se pueden reemplazar dependencias por mocks.
- **Duplicación**: Múltiples instancias del mismo servicio en memoria.
- **Orden de inicialización imposible de controlar**.

Con el contenedor, se garantiza que hay **una sola instancia** de cada servicio y que las dependencias se resuelven en el orden correcto.

## Orden de Construcción

El `createContainer(io)` recibe la instancia de Socket.IO y construye todo en capas:

```
1. Repositorios (acceso a datos)
   └─ UserRepository
   └─ ConnectionRepository

2. Servicios Base (lógica de plataformas)
   └─ ConnectionService (usa ConnectionRepository)
   └─ TwitchService, YouTubeService, KickService

3. Mensajería
   └─ MessageSenderService (usa ConnectionService + servicios de plataforma)

4. Gestión de Chat (proveedores y Manager)
   └─ TwitchChatProvider, YouTubeChatProvider, KickChatProvider, TikTokChatProvider
   └─ ChatManager (registra todos los proveedores y maneja IO)

5. Autenticación y Perfil
   └─ UserService
   └─ AuthDTOBuilder (usa ChatManager para estados en vivo)
   └─ PlatformAuthHandler (usa UserService + AuthDTOBuilder)
   └─ AuthFlowProcessor (usa PlatformAuthHandler + ChatManager)
   └─ UserProfileService (usa UserService + AuthDTOBuilder)
   └─ AuthService (usa AuthFlowProcessor + UserProfileService)

6. Webhooks
   └─ WebhookProcessor

7. Controladores (capa HTTP, los últimos en construirse)
   └─ AuthController (usa AuthService)
   └─ WebhookController (usa WebhookProcessor)
```

## Lo que el Contenedor Expone

No expone todo. Solo entrega al servidor lo estrictamente necesario para el correcto funcionamiento:

| Objeto devuelto        | ¿Para qué?                                  |
| ---------------------- | ------------------------------------------- |
| `chatManager`          | Gestionar conexiones de chat en tiempo real |
| `messageSenderService` | Enviar mensajes desde el dashboard          |
| `connectionService`    | Consultar tokens y cuentas vinculadas       |
| `youtubeService`       | Operaciones específicas de YouTube          |
| `authController`       | Manejar rutas HTTP de autenticación         |
| `webhookController`    | Manejar rutas HTTP de webhooks              |
| `twitchManager`        | Gestionar subscripciones EventSub de Twitch |
| `userService`          | Autenticación por socket y datos de perfil  |

---

ElSantana
