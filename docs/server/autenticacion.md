# Autenticación y OAuth

El sistema de autenticación de Streamlyra gestiona el ciclo de vida completo de un usuario: desde el primer login hasta la vinculación de múltiples redes sociales, todo ello sin que el usuario tenga que recordar contraseñas.

## Flujo General de OAuth

Streamlyra no tiene contraseñas propias. Utiliza **OAuth 2.0** como único método de autenticación. El flujo es:

```
1. El usuario hace clic en "Conectar con Twitch"
2. El frontend redirige al usuario a la URL de autorización de Twitch
3. Twitch redirige de vuelta al frontend con un código temporal (?code=xxx)
4. El frontend envía ese código al servidor (POST /api/auth/twitch/callback)
5. El servidor intercambia el código por tokens de acceso
6. Se crea o actualiza el perfil del usuario en la BD
7. Se inicia una sesión segura con JWT en cookie
```

## Componentes del Módulo `src/services/auth/`

### `AuthService.ts`

La fachada pública que usan los controladores. Coordina los tres sub-sistemas de autenticación sin exponer su complejidad:

- `handleOAuthFlow()`: Para Twitch, YouTube y Kick.
- `handleTikTokFlow()`: Flujo especial sin OAuth para TikTok (solo username).
- `handleLogout()`, `getProfile()`.

### `AuthFlowProcessor.ts`

El orquestador interno de los flujos. Su trabajo principal:

1. Obtiene el perfil y tokens del servicio de plataforma correspondiente.
2. Llama a `PlatformAuthHandler` para guardar o actualizar en base de datos.
3. Si la conexión es nueva, **dispara la conexión al chat en segundo plano** (`void this.chatManager.connectProvider(...)`) para no bloquear la respuesta HTTP al usuario.

### `core/PlatformAuthHandler.ts`

Resuelve la lógica de "upsert" del usuario:

- Si viene un `currentUserId` (usuario ya logueado), **vincula** la nueva cuenta a su perfil existente.
- Si no hay sesión activa, **crea un nuevo usuario** con los datos del perfil de la plataforma.

### `core/UserProfileService.ts`

Construye el objeto de respuesta final (`AuthDTO`) que se envía al frontend tras un login o vinculación exitosa. Incluye todos los datos del usuario y sus conexiones activas.

### `AuthDTOBuilder.ts`

Patrón Builder para construir el objeto de respuesta. Garantiza que la estructura del DTO de autenticación sea siempre consistente y tipada.

### `TokenService.ts`

Genera y verifica los **JWT de sesión** almacenados en cookies `httpOnly`. Abstrae la librería `jsonwebtoken`.

## Flujo Especial: TikTok

TikTok no tiene OAuth público disponible. La autenticación funciona mediante el uso de un cliente de comunidad:

1. El usuario provee solo su **username** de TikTok.
2. El servidor valida el formato (2-24 caracteres, sin `@`, solo alfanumérico).
3. Se crea un "token placeholder" internamente para identificar la conexión.
4. El `TikTokDiscoveryManager` luego busca automáticamente si ese usuario está en vivo.

---

ElSantana
