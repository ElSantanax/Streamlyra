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
- `handleLogout()`: Invalida el perfil del usuario. Tras la última optimización, este proceso es **no bloqueante**. Limpia la sesión del stream y los chats en segundo plano para que el servidor responda de inmediato al cliente.
- `getProfile()`: Recupera el estado completo de la sesión.

### `AuthFlowProcessor.ts`

El orquestador interno de los flujos. Su trabajo principal:

1. Obtiene el perfil y tokens del servicio de plataforma correspondiente.
2. Llama a `PlatformAuthHandler` para guardar o actualizar en base de datos.
3. Si la conexión es nueva, **dispara la conexión al chat en segundo plano** (`void this.chatManager.connectProvider(...)`) para no bloquear la respuesta HTTP al usuario.

### `core/PlatformAuthHandler.ts`

Resuelve la lógica de "upsert" del usuario y asegura la propiedad de las conexiones:

- **Vinculación Segura**: Si viene un `currentUserId` (usuario ya logueado), primero valida que el `providerId` de la plataforma no pertenezca a OTRO usuario. Si hay conflicto, lanza un error `409 Conflict`.
- **Creación de Nuevo Usuario**: Si no hay sesión activa, crea un nuevo usuario con los datos del perfil de la plataforma.
- **Transaccionalidad**: Todas las operaciones de vinculación ocurren dentro de una transacción de base de datos para evitar estados corruptos.

### `core/UserProfileService.ts`

Construye el objeto de respuesta final (`AuthDTO`) que se envía al frontend tras un login o vinculación exitosa. Incluye todos los datos del usuario y sus conexiones activas.

### `AuthDTOBuilder.ts`

Patrón Builder que construye la respuesta final del perfil del usuario. Tras la última actualización, el Builder inyecta el `ChatManager` para consultar el estado real de cada conexión. Esto permite que el objeto devuelto al frontend incluya no solo datos estáticos de la DB, sino también si la plataforma está en estado `searching`, `waiting_stream` o `connected`.

### `TokenService.ts`

Genera y verifica los **JWT de sesión** almacenados en cookies `httpOnly`. Abstrae la librería `jsonwebtoken`.

## Flujo Especial: TikTok

TikTok no tiene OAuth público disponible. La autenticación funciona mediante el uso de un cliente de comunidad:

1. El usuario provee solo su **username** de TikTok.
2. El servidor valida el formato (2-24 caracteres, sin `@`, solo alfanumérico).
3. Se crea un "token placeholder" internamente para identificar la conexión.
4. El `TikTokDiscoveryManager` luego busca automáticamente si ese usuario está en vivo.