# Diccionario Maestro de Archivos (Cliente)

Este documento es una guía exhaustiva de **cada archivo** en el núcleo del cliente (`client/src`). Si buscas entender qué hace exactamente un componente, hook o servicio, este es el lugar.

---

## Raíz (`/src`)

- **`App.tsx`**: Orquestador principal de la aplicación. Configura el sistema de rutas (`react-router-dom`), envuelve con los proveedores de contexto (`AuthProvider`, `DialogProvider`) y los gestores de estado (`ConnectionsManager`).
- **`main.tsx`**: Punto de entrada de React. Inicializa el DOM, configura el `GlobalErrorBoundary` y arranca la configuración de internacionalización (`i18n`).
- **`index.css`**: Definiciones globales de estilos. Incluye las directivas de Tailwind CSS, variables de color personalizadas y estilos base para animaciones.

---

## Stores de Estado (`/store`)

- **`useConnectionsStore.ts`**: Store central (Zustand) para el estado de las conexiones. Gestiona si una plataforma está vinculada, si está en vivo, estadísticas de espectadores y lógica de caché para evitar sobrescrituras de datos de la API sobre estados transitorios de sockets.
- **`useChatStore.ts`**: Store (Zustand) que gestiona el flujo de mensajes. Implementa una cola con "flushing" periódico para optimizar el renderizado ante grandes ráfagas de mensajes.

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
- **`SimpleTimer.tsx`**: Utilidad visual para mostrar tiempos transcurridos (ej: duración de stream).
- **`Spinner.tsx`**: Indicador de carga animado y personalizable.
- **`UserBadge.tsx`**: Renderiza iconos de rango (Moderador, VIP, etc) según la plataforma.

### Interfaz base (`/ui`)
- **`Button.tsx`**: Componente de botón altamente reutilizable con múltiples variantes y tamaños.
- **`Dialog.tsx`**: Componente de diálogo modal (Alert, Confirm, Prompt). Refactorizado para usar sub-componentes internos y garantizar un estado limpio en cada apertura.

### Dashboard (`/dashboard`)
- **`layout/DashboardHeader.tsx`**: Cabecera principal del panel de control, incluye botón de menú y estado de conexión.
- **`layout/Sidebar.tsx`**: Menú lateral que lista las plataformas conectadas y sus estadísticas.
- **`layout/LanguageSelector.tsx`**: Selector flotante para cambiar entre Español e Inglés.
- **`layout/UserMenuHeader.tsx`**: Sección del perfil de usuario en la cabecera.

#### Chat (`/dashboard/chat`)
- **`ChatFeed.tsx`**: El contenedor de mensajes. Gestiona el scroll infinito y la entrada de nuevos mensajes basados en `useChatStore`.
- **`ChatInput/index.tsx`**: Caja de texto para enviar mensajes.
  - `components/EmojiPickerButton.tsx`: Abre el selector de emojis.
  - `components/SendButton.tsx`: Botón de envío con feedback visual.
  - `hooks/useChatInput.ts`: Estado central de la entrada de texto.
  - `hooks/useMessageSender.ts`: Lógica para procesar y enviar el mensaje a la API.
- **`ChatMessage/index.tsx`**: Renderizado de un mensaje individual.
  - `components/MessageActions.tsx`: Botones de moderación (ban, borrar).
  - `components/MessageContent.tsx`: Convierte texto en emotes e iconos.
  - `components/StatusIndicator.tsx`: Muestra el estado del envío (enviando, enviado, error).

#### Conexiones (`/dashboard/connections`)
- **`AddPlatformModal.tsx`**: Modal que guía el proceso de vinculación.
- **`ConnectionItem.tsx`**: Tarjeta visual para una plataforma conectada, soporta estados detallados (`waiting_stream`, `searching`).

---

## Hooks (`/hooks`)

- **`index.ts`**: Punto de acceso centralizado a todos los hooks.
- **`useAuth.ts`**: Hook principal para acceder a los datos del usuario logueado (Context).
- **`useSocket.ts`**: Gestiona el ciclo de vida de la conexión WebSockets, sincronizado con el store de conexiones (Zustand).
- **`useModeration.ts`**: Lógica de moderación delegando acciones al `useChatStore`.
- **`useLocalStorage.ts`**: Maneja el almacenamiento persistente en el navegador.

### Mensajes (`/hooks/useChatMessages`)
- **`useChatMessages.ts`**: Hook consolidado que provee los mensajes desde el `useChatStore`.
- **`helpers.ts`**: Utilidades para filtrar o transformar mensajes en el listado.

### Conexiones (`/hooks/useConnections`)
- **`index.ts`**: Punto de entrada consolidado. Contiene `useConnections`, `useConnectionsStatus` y `useConnectionsStats`.
- **`useConnectionsSocket.ts`**: Escucha actualizaciones en tiempo real y las inyecta en el store de Zustand.
- **`cache.ts`**: Lógica de protección de datos para la sincronización entre API y Sockets.
- **`constants.ts`**: Valores iniciales y configuraciones por defecto.
- **`utils.ts`**: Parsers para normalizar las respuestas de la API hacia el store.

---

## Servicios (`/services`)

- **`api/client.ts`**: Cliente Fetch central con manejo de CSRF y Auth.
- **`api/auth.service.ts`**: Servicios de autenticación y vinculación de plataformas.
- **`session/SessionManager.ts`**: Gestión de la validez de la sesión local.
- **`socket/socket.ts`**: Configuración de `socket.io-client`.

---

## Librerías y Utilidades (`/lib`)

- **`auth/oauth.ts`**: Lógica para construir URLs de autorización.
- **`dialog/dialog.service.ts`**: Servicio imperativo para diálogos.
- **`errors/errorHandler.ts`**: Transformación de errores técnicos en mensajes de usuario.
- **`formatters/emote.formatter.ts`**: Procesamiento de emotes en el chat.
- **`notifications/toast.ts`**: Sistema de notificaciones visuales.

---

## Tipos (`/types`)

- **`index.ts`**: Exportación centralizada.
- **`user.types.ts`**: Interfaces de usuario y conexiones.
- **`chat.types.ts`**: Estructura de mensajes y actualizaciones de estado.

---

## Pruebas (`/test`)

- **`setup.ts`**: Configuración de Vitest.
- **`generators.ts`**: Generadores de datos mock.
- **`mocks.ts`**: Implementación de servicios mock para tests.

---

ElSantana
