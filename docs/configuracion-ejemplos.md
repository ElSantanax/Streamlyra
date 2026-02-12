# Configuración del Entorno de Desarrollo

Esta guía te ayudará a configurar tu entorno de desarrollo para poder contribuir al proyecto Streamlyra.

## Prerrequisitos

Antes de comenzar, asegúrate de tener instalado:

- **Node.js** (v18 o superior)
- **npm** (viene con Node.js)
- **Git**
- **VS Code** (recomendado)

## Paso 1: Clonar el Proyecto

**Input**

```bash
git clone https://github.com/ElSantanax/Streamlyra.git
cd Streamlyra
```

**Output**

El proyecto se clonará en tu máquina local y estarás listo para configurar el entorno.

## Paso 2: Configurar Variables de Entorno

El proyecto usa variables de entorno para manejar credenciales y configuración.

### 2.1 Copiar el archivo de ejemplo

**Input**

```bash
cp server/.env.example server/.env
```

**Output**

Se creará una copia local del archivo de configuración que podrás editar.

### 2.2 Editar el archivo `.env`

Abre el archivo `server/.env` y configura las siguientes variables:

#### Variables Esenciales (mínimo para desarrollo local)

**Input**

```bash
PORT=4000

# Autenticación JWT - Genera una clave segura
JWT_SECRET=tu_jwt_secreto_muy_largo_y_unico_aqui

# Base de datos - Usa Neon o PostgreSQL local
DATABASE_URL=postgresql://usuario:password@host:puerto/database
```

**Output**

Con estas variables básicas podrás iniciar el servidor localmente.

#### Variables para Plataformas (opcional para empezar)

**Input**

```bash
# Twitch
TWITCH_CLIENT_ID=tu_twitch_client_id_aqui
TWITCH_CLIENT_SECRET=tu_twitch_client_secret_aqui
TWITCH_REDIRECT_URI=http://localhost:4000/auth/twitch/callback

# YouTube
YOUTUBE_CLIENT_ID=tu_google_client_id_aqui
YOUTUBE_CLIENT_SECRET=tu_google_client_secret_aqui
YOUTUBE_REDIRECT_URI=http://localhost:4000/auth/youtube/callback

# Kick
KICK_CLIENT_ID=tu_kick_client_id_aqui
KICK_CLIENT_SECRET=tu_kick_client_secret_aqui
KICK_REDIRECT_URI=http://localhost:4000/auth/kick/callback
```

**Output**

Estas variables permiten conectar con las APIs de las plataformas de streaming.

## Paso 3: Obtener Credenciales de las Plataformas

### Twitch

**Input**

1. Ve a [Twitch Developer Console](https://dev.twitch.tv/console)
2. Crea una nueva aplicación
3. Configura el OAuth Redirect URI: `http://localhost:4000/auth/twitch/callback`
4. Copia el Client ID y Client Secret

**Output**

::: info
Obtendrás las credenciales necesarias para conectar con la API de Twitch.
:::

### YouTube

**Input**

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un nuevo proyecto
3. Habilita la YouTube Data API v3
4. Crea credenciales OAuth 2.0
5. Configura el Redirect URI: `http://localhost:4000/auth/youtube/callback`

**Output**

::: tip
YouTube requiere configurar la API en Google Cloud antes de obtener credenciales.
:::

### Kick

**Input**

1. Contacta con Kick para obtener acceso a su API
2. Configura las credenciales correspondientes

**Output**

::: warning
Kick puede requerir un proceso de aprobación especial para acceso a su API.
:::

## Paso 4: Configurar Base de Datos

### Opción A: Neon (Recomendado)

**Input**

1. Crea una cuenta en [Neon](https://neon.tech/)
2. Crea un nuevo proyecto
3. Copia la cadena de conexión a `DATABASE_URL`

**Output**

::: tip
Neon es gratuito y fácil de configurar, ideal para desarrollo.
:::

### Opción B: PostgreSQL Local

**Input**

1. Instala PostgreSQL localmente
2. Crea una base de datos:
   ```sql
   CREATE DATABASE streamlyra_dev;
   ```
3. Configura `DATABASE_URL` con tus credenciales locales

**Output**

::: details
**Ventajas de PostgreSQL local:**
- Control total sobre la base de datos
- Sin dependencias externas
- Ideal para desarrollo offline
:::

## Paso 5: Instalar Dependencias

**Input**

```bash
# Instalar dependencias del servidor
cd server
npm install

# Instalar dependencias del cliente (opcional para desarrollo)
cd ../client
npm install
```

**Output**

Se instalarán todas las dependencias necesarias para ejecutar el proyecto.

## Paso 6: Iniciar el Servidor de Desarrollo

**Input**

```bash
cd server
npm run dev
```

**Output**

El servidor debería iniciar en `http://localhost:4000`

::: info
¡Servidor iniciado correctamente! 🚀
:::

## Paso 7: Verificar Configuración

Para verificar que todo funciona correctamente:

**Input**

1. **Servidor funcionando**: Visita `http://localhost:4000`
2. **Base de datos conectada**: Revisa los logs del servidor
3. **Variables de entorno cargadas**: Deberías ver las configuraciones en los logs de inicio

**Output**

::: info
Si todo está configurado correctamente, verás los logs del servidor sin errores de conexión.
:::

## Herramientas Útiles

### Generar Clave JWT Segura

**Input**

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Output**

```bash
a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456
```

### Generar Clave de Encriptación

**Input**

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Output**

```bash
1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
```

### ngrok para Webhooks (desarrollo)

**Input**

```bash
ngrok http 4000
```

**Output**

```bash
Session Status                online
Account                       Your Name (Plan: Free)
Version                       3.1.0
Region                        United States (us-cal-1)
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.app -> http://localhost:4000
```

## Problemas Comunes

### Error: "DATABASE_URL no configurada"

**Input**

- Asegúrate de haber creado el archivo `.env`
- Verifica que la ruta sea correcta: `server/.env`

**Output**

::: danger
Este error impide que el servidor inicie correctamente.
:::

### Error: "JWT_SECRET inválida"

**Input**

- Genera una nueva clave usando el comando anterior
- Asegúrate que tenga al menos 64 caracteres

**Output**

::: warning
Una JWT_SECRET débil compromete la seguridad de la aplicación.
:::

### Error: "Cliente no autorizado"

**Input**

- Verifica que los Client ID y Secret sean correctos
- Confirma que los Redirect URI coincidan exactamente

**Output**

::: info
Los errores de autorización suelen ser por configuraciones incorrectas en las consolas de desarrollo.
:::

## ¡Listo para Contribuir!

Una vez configurado tu entorno, puedes:

**Input**

- Explorar el código fuente
- Probar las funcionalidades existentes
- Contribuir con nuevas características
- Reportar issues

**Output**

::: info
¡Gracias por tu interés en contribuir a Streamlyra! 🚀
:::

## More

Check out the documentation for the [full list of markdown extensions](https://vitepress.dev/guide/markdown).
