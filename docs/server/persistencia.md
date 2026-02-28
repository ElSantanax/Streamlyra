# Persistencia y Repositorios

Para evitar que la lógica de base de datos se mezcle con la lógica de negocio, Streamlyra utiliza el **Patrón Repository**. Esto nos permite cambiar Sequelize por otro ORM o base de datos en el futuro sin tocar los servicios.

## Capa de Repositorios (`src/repositories/`)

### 1. `UserRepository.ts`

Gestiona todas las operaciones relacionadas con la entidad de Usuario.

- **Búsqueda por ID o Username**: Métodos rápidos para recuperar perfiles.
- **Actualización de Perfil**: Sincroniza la imagen y el nombre del usuario desde las plataformas sociales.
- **Tokens de Overlay**: Generación y verificación de tokens únicos para el acceso de OBS.

### 2. `ConnectionRepository.ts`

Es el repositorio más complejo del sistema, encargado de las redes sociales vinculadas.

- **Caché Inteligente**: Implementa un historial en memoria de los tokens desencriptados por 5 minutos para maximizar el rendimiento.
- **Gestión de Sesiones OAuth**: Guarda, refresca y elimina los tokens de acceso de Twitch, YouTube, Kick y TikTok.
- **Auto-migración**: Si detecta un token guardado en formato antiguo (sin encriptar), lo cifra automáticamente al leerlo para cumplir con los estándares de seguridad actuales.

## Modelos y Entidades (`src/models/`)

Utilizamos **Sequelize-Typescript** para definir nuestras tablas. Las clases decoradas sirven tanto como esquema de base de datos como definiciones de tipo para el código.

- **`User`**: Perfil central del streamer.
- **`Connection`**: Vinculaciones con redes sociales.
- **`UserAnalytics`**: Almacena datos históricos como el último seguidor o raid (con expiración automática de 7 días).
- **`YouTubeQuota`**: Controla el gasto diario de la API de Google.
- **`TwitchWebhook`**: Gestiona el estado y secretos de las suscripciones a EventSub.

---

ElSantana
