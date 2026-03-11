# Diccionario Maestro de Archivos (Cliente)

Este documento es una guía exhaustiva de **cada archivo** en el núcleo del cliente (`client/src`). Si buscas entender qué hace exactamente un componente, hook o servicio, este es el lugar.

---

## Raíz (`/src`)

- **`App.tsx`**: Orquestador principal de la aplicación. Configura el sistema de rutas (`react-router-dom`), envuelve con los proveedores de contexto (`AuthProvider`, `ConnectionsProvider`) y usa `Suspense` para carga perezosa de páginas.
- **`main.tsx`**: Punto de entrada de React. Inicializa el DOM, configura el `GlobalErrorBoundary` y arranca la configuración de internacionalización (`i18n`).
- **`index.css`**: Definiciones globales de estilos. Incluye las directivas de Tailwind CSS, variables de color personalizadas y estilos base para animaciones.

---

## Configuración (`/config`)

- **`env.ts`**: Carga y valida las variables de entorno (como `VITE_API_URL`) usando tipos seguros.
- **`i18n.ts`**: Configuración de `react-i18next`. Define el idioma por defecto, carga las traducciones y detecta el lenguaje del navegador.
- **`routes.ts`**: Define conjuntos de rutas (públicas, privadas, de auth) para ser usadas por el componente `ProtectedRoute`.

---

## Componentes (`/components`)

### Comunes (`/common`)
- **`BackgroundDecorations.tsx`**: Elementos visuales de fondo (gradientes, motas) para mejorar la estética.
- **`GlobalErrorBoundary.tsx`**: Captura errores críticos en toda la app y muestra un fallback amigable.
- **`GlobalErrorFallback.tsx`**: La UI que se muestra cuando el Error Boundary global detecta un fallo.
- **`LocalErrorBoundary.tsx`**: Igual que el global, pero diseñado para envolver secciones pequeñas (evita que un fallo en un componente rompa toda la página).
- **`LocalErrorFallback.tsx`**: UI simplificada para errores locales.
- **`Logo.tsx`**: Componente SVG del logo de Streamlyra.
- **`MobileMenu.tsx`**: Menú lateral desplegable para dispositivos móviles.
- **`Navbar.tsx`**: Barra de navegación superior para las páginas públicas.
- **`ProtectedRoute.tsx`**: Componente de seguridad que verifica la autenticación antes de renderizar una ruta.
- **`SimpleTimer.tsx`**: Utilidad visual para mostrar tiempos transcurridos (ej: duración de stream).
- **`Spinner.tsx`**: Indicador de carga animado y personalizable.
- **`UserBadge.tsx`**: Renderiza iconos de rango (Moderador, VIP, etc) según la plataforma.

### Dashboard (`/dashboard`)
- **`layout/DashboardHeader.tsx`**: Cabecera principal del panel de control, incluye botón de menú y estado de conexión.
- **`layout/Sidebar.tsx`**: Menú lateral que lista las plataformas conectadas y sus estadísticas.
- **`layout/LanguageSelector.tsx`**: Selector flotante para cambiar entre Español e Inglés.
- **`layout/UserMenuHeader.tsx`**: Sección del perfil de usuario en la cabecera.

#### Chat (`/dashboard/chat`)
- **`ChatFeed.tsx`**: El contenedor de mensajes. Gestiona el scroll infinito y la entrada de nuevos mensajes.
- **`ChatInput/index.tsx`**: Caja de texto para enviar mensajes.
  - `components/EmojiPickerButton.tsx`: Abre el selector de emojis.
  - `components/SendButton.tsx`: Botón de envío con feedback visual.
  - `hooks/useChatInput.ts`: Estado central de la entrada de texto.
  - `hooks/useMessageSender.ts`: Lógica para procesar y enviar el mensaje a la API.
  - `utils/messageValidation.ts`: Valida longitud y contenido del mensaje.
- **`ChatMessage/index.tsx`**: Renderizado de un mensaje individual.
  - `components/MessageActions.tsx`: Botones de moderación (ban, borrar).
  - `components/MessageContent.tsx`: Convierte texto en emotes e iconos.
  - `components/StatusIndicator.tsx`: Muestra el estado del envío (enviando, enviado, error).

#### Conexiones (`/dashboard/connections`)
- **`AddPlatformModal.tsx`**: Modal que guía el proceso de vinculación OAuth.
- **`ConnectionItem.tsx`**: Tarjeta visual para una plataforma conectada (Twitch, YT, etc).

---

## Hooks (`/hooks`)

- **`index.ts`**: Punto de acceso centralizado a todos los hooks.
- **`useAuth.ts`**: Hook principal para acceder a los datos del usuario logueado.
- **`useAuthContext.ts`**: Definición interna del contexto de autenticación.
- **`useSocket.ts`**: Gestiona el ciclo de vida de la conexión WebSockets.
- **`useModeration.ts`**: Lógica compartida para realizar acciones de baneo o borrado.
- **`useLocalStorage.ts`**: Maneja el almacenamiento persistente en el navegador con sincronización de estado.
- **`useToggle.ts`**: Pequeña utilidad para manejar estados booleanos (open/close).

### Mensajes (`/hooks/useChatMessages`)
- **`useChatMessages.ts`**: Gestiona el arreglo de mensajes en memoria, limitando la cantidad para evitar lag.
- **`helpers.ts`**: Utilidades para filtrar o transformar mensajes en el listado.

### Conexiones (`/hooks/useConnections`)
- **`useConnections.ts`**: Orquestación entre la API y el Socket para saber qué plataformas están online.
- **`useConnectionsApi.ts`**: Peticiones iniciales para cargar el estado de las cuentas.
- **`useConnectionsSocket.ts`**: Escucha actualizaciones en tiempo real de espectadores/followers.
- **`cache.ts`**: Lógica para no sobrescribir datos nuevos con datos viejos de la API.

---

## Servicios (`/services`)

- **`api/client.ts`**: El cliente "Fetch" personalizado. Maneja headers, cookies y errores 401/CSRF.
- **`api/auth.service.ts`**: Funciones para `/me`, `/logout` y obtención de tokens de overlay.
- **`session/SessionManager.ts`**: Objeto singleton que limpia la memoria local si la sesión expira.
- **`socket/socket.ts`**: Configuración de `socket.io-client` y manejo de la instancia global.

---

## Librerías y Utilidades (`/lib`)

- **`auth/oauth.ts`**: Lógica para construir URLs de autorización para Twitch, YouTube y Kick.
- **`auth/pkce.ts`**: Implementación de *Proof Key for Code Exchange* para flujos OAuth seguros desde el cliente.
- **`dialog/dialog.service.ts`**: Permite abrir diálogos de confirmación desde cualquier parte del código (sin JSX).
- **`dialog/DialogProvider.tsx`**: El componente que debe estar al inicio de la app para renderizar los diálogos solicitados por el servicio.
- **`errors/errorHandler.ts`**: Centraliza el logging y la transformación de errores de red en mensajes legibles.
- **`formatters/emote.formatter.ts`**: Parsea el texto buscando patrones de emotes y los mapea a URLs de imágenes.
- **`formatters/number.formatter.ts`**: Utilidad para mostrar visualizaciones compactas de números (ej: 1.5k espectadores).
- **`notifications/toast.ts`**: Envoltorio sobre la librería de alertas (toasts), permite colocar los mensajes en contenedores específicos del DOM.
- **`validators/username.validator.ts`**: Reglas de validación para nombres de usuario prohibidos o formatos inválidos.

---

## Tipos (`/types`)

- **`index.ts`**: Re-exporta todos los tipos para centralizar las importaciones.
- **`user.types.ts`**: Interfaces de `User`, `ConnectionInfo`, y estados de sesión.
- **`chat.types.ts`**: Estructura de `ChatMessage`, `ViewersUpdate`, y `ConnectionStatusUpdate` (online/offline).
- **`message.types.ts`**: Tipos para payloads de sockets y acciones de moderación (ban, delete).

---

## Pruebas (`/test`)

- **`setup.ts`**: Configura `vi` (Vitest), mocks de `IntersectionObserver` y otros globales de navegador.
- **`generators.ts`**: Crea datos aleatorios realistas para tests (ej: generar un usuario falso).
- **`mocks.ts`**: Versión falsa de la API y Sockets para no depender del backend en tests.

---

ElSantana
