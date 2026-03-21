# Catálogo de Componentes

La interfaz del cliente está compuesta por una jerarquía de componentes que se organizan en (`src/components/`) para maximizar la reutilización y el orden.

## Componentes Comunes (`common/`)

Componentes genéricos que pueden usarse en cualquier parte de la aplicación.

| Componente | Descripción |
| :--- | :--- |
| `Spinner` | Indicador de carga altamente configurable (tamaño, color, pantalla completa). |
| `UserBadge` | Muestra insignias de usuario (Streamer, Mod, VIP, Sub) con estilos específicos por plataforma. |
| `Logo` | Representación visual de la marca Streamlyra. |
| `Navbar` | Barra de navegación superior con enlaces de navegación pública. |
| `ProtectedRoute` | Envoltorio para rutas que requieren que el usuario esté autenticado. |
| `ErrorBoundary` | Gestión centralizada de errores en el renderizado de React (Global y Local). |

---

## Interfaz Base (`ui/`)

Componentes visuales fundamentales para construir la interfaz.

| Componente | Descripción |
| :--- | :--- |
| `Button` | Botón estilizado con variantes (primary, danger, ghost) y soporte para estados de carga. |
| `Dialog` | Sistema de modales (Alert, Confirm, Prompt). Refactorizado para garantizar limpieza de estado. |

---

## Panel de Control (`dashboard/`)

Componentes específicos del área de administración del streamer.

### Chat Unificado (`chat/`)

- **ChatFeed**: Orquestador que renderiza la lista de mensajes consumiendo del `useChatStore`. Maneja el scroll automático y la optimización de renderizado mediante actualizaciones por lotes (batching).
- **ChatMessage**: Desglose visual de un mensaje individual. Incluye:
    - `MessageContent`: Procesa el texto para detectar y mostrar emoticonos, enlaces y menciones.
    - `StatusIndicator`: Muestra el estado del mensaje (enviando, entregado, error).
    - `MessageActions`: Menú contextual para moderación, sincronizado con las acciones del store.
    - **Formateo de Tiempo**: Utiliza `formatLocalTime` para mostrar la hora del mensaje en la zona horaria del usuario.
    - **Iconografía Adaptable**: Muestra iconos de plataforma (Twitch, Kick, YouTube, TikTok) con tamaños y colores específicos para cada una.
- **ChatInput**: Campo de texto para enviar mensajes. Gestiona estados de envío locales y globales.

### Gestión de Conexiones (`connections/`)

- **AddPlatformModal**: Ventana emergente que guía al usuario para vincular una nueva cuenta de streaming.
- **ConnectionItem**: Muestra el estado individual consumiendo del `useConnectionsStore`. Soporta estados detallados como `searching` (buscando en vivo) o `waiting_stream`.

---

## Prácticas de Componentes

1.  **Envoltorios de Errores (LocalErrorBoundary)**: Las secciones críticas del dashboard están envueltas en Error Boundaries locales. Esto permite que, si el chat falla, el resto del dashboard siga funcionando.
2.  **Memorización con `useMemo` y `useCallback`**: Los componentes del chat (Feed, Mensajes) utilizan memorización intensiva para evitar re-renders cuando llegan cientos de mensajes por segundo.
3.  **Animaciones con `framer-motion` o CSS puro**: Se utilizan transiciones suaves para la entrada y salida de mensajes, así como para la apertura de modales y menús laterales.
4.  **Soporte i18n**: Todos los componentes utilizan el hook `useTranslation` de `react-i18next` para evitar textos hardcodeados.
