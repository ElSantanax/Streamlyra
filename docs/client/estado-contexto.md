# Gestión del Estado y Contexto

Streamlyra utiliza la API Context de React para gestionar el estado global que debe ser accesible desde cualquier parte de la aplicación, como la información del usuario autenticado y el estado de las conexiones con las plataformas de streaming.

## AuthProvider

El `AuthProvider` es el encargado de gestionar la sesión del usuario. Utiliza `localStorage` para persistir la información básica del usuario y tokens de sesión.

### Funcionalidades principales

- **Persistencia**: Mantiene al usuario conectado entre recargas de página.
- **Validación**: Verifica la validez del token con el servidor al iniciar la aplicación en rutas protegidas.
- **Redirección Automática**: Maneja el flujo de login y logout, redirigiendo al usuario según su estado de autenticación.
- **Sincronización**: Detecta cuando una sesión ha expirado y limpia el estado local.

### Hook: `useAuth`

Permite acceder a:
- `user`: Objeto con los datos del usuario actual.
- `status`: Estado actual (`authenticated`, `unauthenticated`, `unknown`).
- `isAuthenticated`: Booleano de conveniencia.
- `login(userData)` / `logout()`: Funciones para manejar la sesión.

---

## ConnectionsProvider

Este proveedor gestiona el estado de las conexiones con las diferentes plataformas (Twitch, YouTube, Kick, TikTok). Está optimizado para separar el estado que cambia poco (si está conectado) del estado que cambia frecuentemente (stats en vivo).

### Contextos Separados

Para evitar re-renders innecesarios, se divide en dos contextos:

1.  **ConnectionsStatusContext**:
    - `connectionsStatus`: Indica qué plataformas están vinculadas y si están en vivo.
    - `isLoadingConnections`: Estado de carga inicial.
    - `disconnectPlatform(platform)`: Función para desvincular una cuenta.

2.  **ConnectionsStatsContext**:
    - `connectionsStats`: Datos en tiempo real como número de espectadores, seguidores, etc.
    - `lastFollower` / `lastRaid`: Información sobre los últimos eventos recibidos.

### Lógica de Reconexión

El `ConnectionsProvider` utiliza el hook `useConnections` para sincronizar periódicamente el estado de las transmisiones y manejar los eventos de sockets entrantes que actualizan las estadísticas.

---

## DialogProvider (lib/dialog)

Aunque no es un contexto tradicional de `src/context`, el `DialogProvider` provee una interfaz imperativa para mostrar diálogos de confirmación y alertas en toda la aplicación sin necesidad de declarar estados de "abierto/cerrado" en cada componente.
