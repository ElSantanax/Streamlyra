# Base de Datos y Modelos

Streamlyra utiliza **PostgreSQL** como motor de base de datos relacional, gestionado a través de **Sequelize** y **Sequelize-Typescript** para asegurar un esquema robusto y tipado.

## Resumen Técnico

- **Tecnología**: PostgreSQL (Vía Neon.tech).
- **ORM**: Sequelize con decoradores de TypeScript.
- **Conexión**: Gestionada en `src/config/db.ts` con soporte para SSL en producción y un sistema de reintentos automático al arrancar.

## Modelos Principales

La lógica se divide en varias entidades clave:

### Usuarios (`User.model.ts`)

Almacena la información básica de la cuenta.

- **Campos Clave**: `username`, `email`, `profileImage`.
- **Seguridad**: `overlayToken` y `overlayTokenHash` para accesos externos (OBS).

### Conexiones (`Connection.model.ts`)

Guarda la vinculación con plataformas externas (Twitch, YouTube, etc.).

- **Datos Sensibles**: Almacena `accessToken` y `refreshToken` (encriptados en la base de datos).
- **Relación**: Pertenece a un `User`.

### Webhooks (`TwitchWebhook.model.ts`, `KickWebhook.model.ts`)

Persisten el estado de las suscripciones a eventos de terceros.

- **Propósito**: Evitar duplicidad de webhooks y gestionar el ciclo de vida de las suscripciones a eventos de la plataforma.

### Cuotas y Streaming (`YouTubeQuota.model.ts`, `YouTubeSubscription.model.ts`)

Debido a las limitaciones de la API de YouTube, rastreamos:

- **Cuotas**: Consumo diario de la API para evitar bloqueos.
- **Suscripciones**: Integraciones mediante PubSubHubbub.

## Sincronización y Migraciones

Actualmente, el servidor utiliza `db.sync()` durante el arranque para asegurar que el esquema de la base de datos coincida con los modelos definidos en el código.

> [!IMPORTANT]
> En entornos de producción, asegúrate de que `DATABASE_URL` tenga los permisos adecuados y que el pool de conexiones (`max: 20`) esté bien configurado según la capacidad de tu base de datos.

## Consultas y Repositorios

Para mantener la separación de responsabilidades, los modelos **no se llaman directamente** desde los controladores. En su lugar, utilizamos la capa de **Repositories** (`src/repositories/implementations`) que encapsula la lógica de acceso a datos de Sequelize.