# Integración de Plataformas

Streamlyra está diseñado para ser extensible. Cada plataforma de streaming (Twitch, YouTube, Kick, etc.) se integra mediante un conjunto de servicios especializados que manejan la autenticación, la obtención de datos y la mensajería en tiempo real.

## Conceptos Clave

Para añadir o gestionar una plataforma, intervenimos principalmente en dos áreas:

### 1. Servicios de Plataforma (`/services/platforms`)

Estos servicios actúan como clientes de las APIs oficiales. Se encargan de:

- Realizar peticiones HTTP a los endpoints de la plataforma.
- Gestionar cuotas (especialmente importante en **YouTube** con `YouTubeQuotaManager`).
- Manejar eventos específicos del servidor (como Webhooks de Twitch vía `TwitchEventSubClient`).

### 2. Proveedores de Chat (`/services/chat`)

Cada plataforma tiene su propia implementación de un `ChatProvider`. Esta capa normaliza la comunicación en tiempo real:

- **Conexión**: Maneja el ciclo de vida de la conexión (IRC para Twitch, Polling para YouTube, Sockets para Kick).
- **Normalización**: Convierte los mensajes crudos de cada plataforma a un formato estándar de Streamlyra.
- **Acciones**: Permite enviar mensajes o realizar moderación de forma uniforme.

## Flujo de Autenticación

Streamlyra utiliza OAuth2 para la mayoría de las plataformas. El flujo general es:

1. El usuario inicia el login desde el cliente.
2. El servidor redirige a la plataforma (Twitch/YouTube).
3. Tras la autorización, el `AuthFlowProcessor` recibe el código, obtiene los tokens y los persiste en la base de datos de forma encriptada.
4. Se asocia la `Connection` al usuario y se activa automáticamente el `ChatProvider` correspondiente.

## Resumen de Plataformas Soportadas

| Plataforma  | Método de Chat      | Características                                                        |
| :---------- | :------------------ | :--------------------------------------------------------------------- |
| **Twitch**  | IRC / EventSub      | Soporta chat, alertas de seguimiento, suscripciones y raids.           |
| **YouTube** | Live Streaming API  | Gestión de cuotas integrada y polling optimizado para el chat en vivo. |
| **Kick**    | Pusher (Websockets) | Conexión en tiempo real basada en eventos de socket.                   |
| **TikTok**  | HTTP Polling        | Soporte básico para lectura de eventos de chat.                        |

## Cómo añadir una nueva plataforma

1. Definir la constante en `src/constants/platforms.ts`.
2. Crear un servicio en `src/services/platforms` para las llamadas a la API.
3. Implementar un `ChatProvider` en `src/services/chat`.
4. Registrar el nuevo proveedor en el `ChatManager` dentro de `src/services/container.ts`.

---

ElSantana
