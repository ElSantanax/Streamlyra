# Configuracion de Variables

Para poner en marcha **Streamlyra**, necesitas configurar las variables de entorno tanto en el servidor como en el cliente. Sigue estos pasos para obtener las credenciales y configurar los archivos correctamente.

## 1. Consolas de Desarrollador

Obten tus credenciales en los paneles oficiales de cada plataforma:

| Plataforma  | Enlace al Panel                                           | Propósito                                    |
| :---------- | :-------------------------------------------------------- | :------------------------------------------- |
| **Twitch**  | [Twitch Developer Console](https://dev.twitch.tv/console) | `CLIENT_ID`, `CLIENT_SECRET`                 |
| **YouTube** | [Google Cloud Console](https://console.cloud.google.com/) | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` |
| **Kick**    | [Kick Developer Portal](https://docs.kick.com/)           | `KICK_CLIENT_ID`, `KICK_CLIENT_SECRET`       |
| **Neon**    | [Neon Console](https://console.neon.tech/)                | `DATABASE_URL` (PostgreSQL)                  |
| **ngrok**   | [ngrok Dashboard](https://dashboard.ngrok.com/)           | `APP_URL` (Webhooks locales)                 |

## 2. Generacion de Secretos Locales

Ejecuta estos comandos en tu terminal para generar las claves de seguridad:

### JWT Secret

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### Encryption Key

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 3. Ejemplo de Archivos .env

### Servidor (server/.env)

```properties
PORT=4000
JWT_SECRET=tu_jwt_secreto_generado
DATABASE_URL=postgresql://usuario:password@host:puerto/database
ENCRYPTION_KEY=tu_encryption_key_generada

# Twitch
TWITCH_CLIENT_ID=tu_twitch_client_id
TWITCH_CLIENT_SECRET=tu_twitch_client_secret
TWITCH_REDIRECT_URI=http://localhost:5173/auth/callback

# YouTube
YOUTUBE_CLIENT_ID=tu_youtube_client_id
YOUTUBE_CLIENT_SECRET=tu_youtube_client_secret
YOUTUBE_REDIRECT_URI=http://localhost:5173/auth/callback

# Kick
KICK_CLIENT_ID=tu_kick_client_id
KICK_CLIENT_SECRET=tu_kick_client_secret
KICK_REDIRECT_URI=http://localhost:5173/auth/callback

# Webhooks
APP_URL=tu_url_de_ngrok
KICK_WEBHOOK_SKIP_SIGNATURE=true
```

### Cliente (client/.env)

```properties
VITE_TWITCH_CLIENT_ID=tu_twitch_client_id
VITE_YOUTUBE_CLIENT_ID=tu_youtube_client_id
VITE_KICK_CLIENT_ID=tu_kick_client_id
```

---

::: tip IMPORTANTE
Asegúrate de que los **Redirect URIs** coincidan exactamente con lo configurado en las consolas de desarrollador.
:::
