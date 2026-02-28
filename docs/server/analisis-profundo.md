# Análisis Profundo del Código (Server)

Esta sección proporciona una visión detallada de los componentes internos más críticos de Streamlyra, analizando cómo interactúan los servicios y repositorios para gestionar el ecosistema de streaming.

## Núcleo de Orquestación: `ChatManager`

El `ChatManager` (`src/services/core/ChatManager.ts`) es el cerebro que coordina los diferentes proveedores de chat. Su responsabilidad es:

- **Gestión de Sesiones**: Conecta y desconecta dinámicamente los proveedores de chat cuando un usuario entra o sale de la plataforma.
- **Abstracción**: Permite que el resto del sistema interactúe con el chat de forma universal mediante la interfaz `ChatProvider`.
- **Sincronización**: Utiliza `Promise.allSettled` para manejar conexiones múltiples simultáneamente, garantizando que un fallo en una plataforma (ej. Kick) no impida que las demás (Twitch/YouTube) se conecten.

## Estrategias de Comunicación por Plataforma

Cada red social requiere una técnica de comunicación distinta, implementada en `src/services/chat/`:

### Twitch: Eventos Orientados a Suscripción

Managed por `TwitchManager`, utiliza **Twitch EventSub**.

- **Registro Masivo**: Al conectar, el sistema registra automáticamente webhooks para mensajes de chat, follows, subs, raids y status de stream.
- **Sincronización al Arranque**: Posee una lógica de "auto-sanación" que limpia suscripciones huérfanas o con URLs obsoletas al iniciar el servidor.

### YouTube: Sondeo Adaptativo (Polling)

Implementado en `YouTubeChatPoller`, soluciona las limitaciones de la API de Google:

- **Distribución de Mensajes**: Si el poller recibe muchos mensajes de golpe, los distribuye gradualmente en el tiempo para que el cliente los reciba de forma fluida y no saturar el UI.
- **Gestión de Cuotas**: Integra un `YouTubeQuotaManager` que ajusta el intervalo de sondeo dinámicamente; si las cuotas están bajas, el chat se vuelve más lento automáticamente para evitar el bloqueo del servicio.

### Kick: Sockets en Tiempo Real

Basado en Websockets (Pusher), permite una respuesta inmediata con una carga mínima para el servidor.

## Gestión de Datos y Token Cache

El `ConnectionRepository` (`src/repositories/implementations/ConnectionRepository.ts`) implementa una capa de persistencia avanzada:

- **Caché de Tokens**: Mantiene un caché en memoria de 5 minutos para los tokens planos decodificados. Esto evita el uso intensivo de la CPU (desencriptación AES) en cada mensaje enviado.
- **Auto-Migración**: Detecta automáticamente tokens antiguos sin encriptar y los migra al formato seguro GCM durante la lectura.
- **Transaccionalidad**: Todas las actualizaciones críticas de tokens utilizan transacciones de base de datos para evitar estados inconsistentes.

## Flujos Transversales

1. **Transformación de Eventos**: Cada plataforma tiene un `Transformer` que convierte formatos propietarios (ej. el complejo objeto de YouTube) en el `NormalizedMessage` de Streamlyra.
2. **Emisión Segura**: El `SafeSocketEmitter` centraliza el envío hacia el cliente, asegurando que los eventos lleguen solo al `userId` correcto y con el formato esperado.

---

ElSantana
