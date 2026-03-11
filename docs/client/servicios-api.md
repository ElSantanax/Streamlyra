# Comunicación con el Servidor

El cliente de Streamlyra se comunica con el backend principalmente a través de una API RESTful y una conexión WebSocket para datos en tiempo real.

## Cliente HTTP (`services/api/client.ts`)

En lugar de usar `fetch` directamente en los componentes, utilizamos una clase `HttpClient` personalizada que envuelve la API Fetch nativa.

### Características del Cliente

- **Base URL Centralizada**: Toma la URL del backend desde las variables de entorno (`VITE_API_URL`).
- **Gestión de Credenciales**: Configurado con `credentials: 'include'` para soportar cookies HTTP-Only (necesarias para la sesión y CSRF).
- **Intercepción de Errores**: Captura automáticamente errores 401 (No Autorizado) y activa el flujo de cierre de sesión si la ruta es protegida.
- **Seguridad CSRF**: Adjunta automáticamente el token CSRF desde las cookies (`X-CSRF-Token`) en peticiones de mutación (POST, DELETE).
- **Tipado Fuerte**: Todas las peticiones son genéricas, permitiendo definir el tipo de respuesta esperado.

---

## Servicios Disponibles

### AuthService (`auth.service.ts`)
Gestiona la autenticación y el perfil del usuario.
- `getMe()`: Obtiene los datos del usuario logueado.
- `logout()`: Invalida la sesión en el servidor.
- `getOverlayToken()`: Solicita el token único para la fuente de OBS.

### ConnectionsService (Proximamente)
Gestiona la vinculación y desvinculación de plataformas de streaming.
- `getConnections()`: Lista todas las cuentas vinculadas.
- `disconnect(platform)`: Elimina la vinculación con una plataforma específica.

---

## Comunicación en Tiempo Real (`services/socket`)

Para el chat unificado y las estadísticas en vivo, el cliente utiliza `socket.io-client`.

### Flujo de Conexión

1.  El cliente se conecta al servidor de sockets cuando el usuario entra al Dashboard.
2.  Envía el token de sesión (o token de overlay) para autenticar la conexión del socket.
3.  Escucha eventos globales como:
    - `chat_message`: Nuevo mensaje en cualquiera de las plataformas.
    - `stats_update`: Cambio en espectadores o seguidores.
    - `message_deleted`: Notificación para eliminar un mensaje del feed local.

### Hook `useSocket`

Abstrae la complejidad de la conexión:
- Maneja la reconexión automática.
- Sincroniza el estado de la conexión con la interfaz (indicador de conexión).
- Distribuye los mensajes entrantes a los hooks de estado del chat.
