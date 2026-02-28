# Integración con YouTube

YouTube es académicamente la plataforma más compleja debido a sus estrictos límites de cuota y la naturaleza de su API de Live Streaming. Streamlyra implementa sistemas avanzados para maximizar la eficiencia y estabilidad.

## Configuración de Google Cloud Console

Para que la integración funcione, debes configurar un proyecto en [Google Cloud Console](https://console.cloud.google.com/):

### 1. Habilitar APIs

Debes activar la **YouTube Data API v3** en tu proyecto.

### 2. Credenciales OAuth 2.0

- **Tipo de aplicación**: Aplicación web.
- **Orígenes de JavaScript autorizados**: La URL de tu frontend (ej. `http://localhost:5173`).
- **URIs de redireccionamiento autorizados**: La URL configurada en `YOUTUBE_REDIRECT_URI` (ej. `http://localhost:5173/auth/callback/youtube`).

### 3. Pantalla de Consentimiento (Scopes)

Streamlyra requiere los siguientes permisos (scopes):

- `.../auth/youtube.readonly`: Para leer el chat y estado del stream.
- `.../auth/youtube.force-ssl`: Para enviar mensajes y realizar acciones de moderación.

## Configuración Interna y Cuotas

Dado que YouTube tiene límites estrictos, Streamlyra utiliza una configuración específica ubicada en `src/config/youtube.polling.config.ts`:

### Costos de Operación

Cada acción "gasta" unidades de tu cuota diaria (límite de 10,000 unidades):

- **Lectura de Chat**: 1 unidad por cada consulta (realizada cada 15s).
- **Envío de Mensajes**: 50 unidades (operación costosa).
- **Moderación (Ban/Delete)**: 50 unidades por acción.

### Gestión Inteligente de Cuotas (`YouTubeQuotaManager`)

Nuestro gestor no solo cuenta unidades, sino que adapta el comportamiento del servidor:

- **Intervalo Adaptativo**:
  - Si has consumido < 50% de la cuota: Polling cada 15s.
  - Si has consumido > 50%: El intervalo sube a 30s.
  - Si has consumido > 80%: El intervalo sube a 45s.
- **Caché de Contexto**: Almacena el `liveChatId` en la base de datos (`YouTubeStreamContext`) para no gastar cuota redescubriéndolo en cada reconexión del cliente.

## Polling y Distribución de Mensajes

El sistema de sondeo (`YouTubeChatPoller`) incluye una lógica de **Suavizado de Mensajes**:

- Si el servidor recibe 20 mensajes nuevos tras una espera de 15s, no los envía todos al cliente de golpe.
- Los dosifica uniformemente a lo largo de los siguientes 12 segundos (80% del intervalo) para que el chat del streamer fluya de manera constante y natural.

---

ElSantana
