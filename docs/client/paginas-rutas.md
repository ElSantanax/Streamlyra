# Páginas y Rutas

Streamlyra utiliza `react-router-dom` para gestionar la navegación. Las rutas están definidas en `App.tsx` y se dividen en rutas públicas, rutas de autenticación y rutas protegidas.

## Mapa de Rutas

| Ruta | Componente | Acceso | Descripción |
| :--- | :--- | :--- | :--- |
| `/` | `Landing` | Público | Página de inicio con información del proyecto. |
| `/login` / `/register` | `PlatformConnection` | Público | Acceso y registro (actualmente redirigen a conexión). |
| `/auth/callback` | `AuthCallback` | Público | Maneja el retorno de OAuth desde el servidor. |
| `/dashboard` | `Dashboard` | Protegido | Panel principal de control y chat unificado. |
| `/connect` | `PlatformConnection` | Protegido | Gestión de cuentas vinculadas. |
| `/overlay/chat/:token` | `OverlayChat` | Especial | Chat optimizado para OBS/Streaming (usa token de acceso). |

---

## Detalle de Páginas Críticas

### Dashboard

Es el orquestador principal de la aplicación para el streamer. 
- **Lógica**: Utiliza múltiples hooks (`useSocket`, `useChatMessages`, `useModeration`) para coordinar la recepción y gestión de mensajes.
- **Componentes**: Incluye el `Sidebar` para el estado de las plataformas, el `ChatFeed` para ver los mensajes y el `ChatInput` para interactuar.
- **Estado**: Depende fuertemente de los proveedores de contexto para saber qué plataformas están conectadas.

### OverlayChat

Una página diseñada específicamente para ser cargada como una "Browser Source" en OBS o herramientas similares.
- **Optimización**: No tiene fondos opacos (usa transparencia), los mensajes desaparecen automáticamente tras un tiempo configurable y está optimizado para bajo consumo de recursos.
- **Seguridad**: No requiere que el navegador de OBS esté logueado; funciona mediante un `token` único generado por el servidor que identifica la sesión del usuario.
- **Rendimiento**: Mantiene un máximo de 50 mensajes en el DOM para evitar degradación de rendimiento en streams largos.

### AuthCallback

Esta página es puramente lógica y sirve como punto final de los flujos OAuth.
- Recibe el token JWT en la URL después de un login exitoso.
- Almacena el token en la sesión local.
- Solicita los datos del usuario al servidor para completar el perfil.
- Redirige al usuario al `/dashboard`.

---

## Protección de Rutas (`ProtectedRoute`)

Componente de orden superior que envuelve las rutas sensibles.
- Verifica si el usuario está autenticado mediante el `AuthContext`.
- Si no hay sesión, redirige a `/login` guardando la ruta de origen para volver después del login.
- Muestra un Spinner de carga mientras se verifica la validez de la sesión con el backend.
