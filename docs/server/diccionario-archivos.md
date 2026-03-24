# Diccionario de Archivos del Servidor

Este documento es una referencia completa de la estructura de archivos en `server/src`. Aquí se detalla la responsabilidad de cada directorio y sus archivos más importantes para asegurar una comprensión total del proyecto.

## Estructura de Raíz (`/src`)

- **`index.ts`**: Punto de entrada principal. Configura los listeners de señales de sistema (SIGTERM) e inicia el servidor.
- **`server.ts`**: Configura la instancia de HTTP, Socket.io y el contenedor de dependencias. Ejecuta tareas de arranque como la migración de tokens.
- **`app.ts`**: Configura la aplicación Express, middlewares globales (CORS, JSON, Cookies) y registra las rutas.

## Directorios de Soporte

### `/config` (Configuración)

- **`index.ts`**: Cargador central de variables de entorno.
- **`db.ts`**: Configuración de Sequelize y pool de conexiones PostgreSQL.
- **`oauth.config.ts`**: Credenciales para Twitch, YouTube y Kick.
- **`validation.ts`**: Lógica de validación de entorno.
- **`*.polling.config.ts`**: Parámetros de intervalos y cuotas para cada plataforma.

### `/constants` (Constantes)

- **`platforms.ts`**: Definición de nombres y tipos de plataformas soportadas.
- **`*-emotes.ts`**: Mapeo de identificadores de emotes para la normalización del chat.

### `/dtos` (Data Transfer Objects)

- **`auth.dto.ts`**: Esquemas de Zod para validar la entrada de datos en rutas de autenticación.

### `/types` (Definiciones de Tipos)

- Contiene interfaces e interfaces globales para TypeScript, asegurando que los objetos de mensaje (`NormalizedMessage`) y usuario tengan una estructura consistente en todo el servidor.

### `/utils` (Utilidades)

- **`AppError.ts`**: Clase base para manejo de errores operativos.
- **`SafeSocketEmitter.ts`**: Envoltorio para enviar eventos de socket sin errores de referencia.
- **`encryptionService.ts`**: Lógica AES-256-GCM para tokens.
- **`logger.ts`**: Configuración de Pino para registro de eventos.

## Capas de Lógica

### `/controllers` (Controladores)

Intermediarios entre las rutas HTTP y los servicios.

- **`auth.controller.ts`**: Maneja login, logout y vinculación de cuentas.
- **`webhook.controller.ts`**: Procesa las entradas de eventos de terceros.

### `/routes` (Rutas)

Definición de endpoints Express.

- **`auth.routes.ts`**: Rutas protegidas y públicas de usuario.
- **`webhook.routes.ts`**: Rutas para recibir EventSub de Twitch, PubSub de YouTube, etc.

### `/repositories` (Acceso a Datos)

Abstracción de la base de datos (Patrón Repository).

- **`implementations/`**: Contiene la lógica real usando Sequelize (`UserRepository`, `ConnectionRepository`).
- **`interfaces/`**: Define los contratos (Interfaces) para permitir el intercambio de la base de datos o facilitar el testing.

### `/models` (Entidades DB)

Definiciones de tablas mediante Sequelize-Typescript.

- **`User.model.ts`**, **`Connection.model.ts`**, etc.

## El Corazón del Sistema: `/services`

Este es el directorio más denso (~100 archivos). Se divide en:

- **`auth/`**: Lógica de flujos OAuth y procesamiento de perfiles. Incluye el **`AuthDTOBuilder.ts`**, responsable de construir la respuesta de perfil del usuario sincronizando datos de la DB con el estado en tiempo real del `ChatManager`.
- **`chat/`**: Implementaciones de **`ChatProvider`** para cada plataforma. Tras la refactorización, estos proveedores ahora implementan `getStatus()` para reportar estados granulares (buscando, conectado, sin live) al sistema central.
- **`platforms/`**: Clientes de API específicos (TwitchHelixClient, YouTubeDataClient).
- **`core/`**: Gestores de nivel orquestador como **`ChatManager.ts`** (estado de chats) y **`StreamSessionManager.ts`** (monitoreo de sesiones en vivo).
- **`security/`**: Servicios de encriptación y hashing.
- **`cron/`**: Tareas programadas (ej. renovación de suscripciones de YouTube).

## Comunicación en Tiempo Real: `/socket`

- **`socket.handler.ts`**: Switch central para eventos de socket.
- **`handlers/`**: Lógica segregada por dominio (mensajes, moderación, conexiones).
- **`services/`**: Lógica de soporte del socket. Destaca el `SocketConnectionManager`, encargado de la resiliencia del usuario mediante el Periodo de Gracia ante desconexiones.
- **`middleware/`**: Autenticación específica para conexiones de WebSocket.