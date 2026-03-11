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

## Panel de Control (`dashboard/`)

Componentes específicos del área de administración del streamer.

### Chat Unificado (`chat/`)

- **ChatFeed**: Orquestador que renderiza la lista de mensajes entrantes. Maneja el scroll automático y la optimización de renderizado.
- **ChatMessage**: Desglose visual de un mensaje individual. Incluye:
    - `MessageContent`: Procesa el texto para detectar y mostrar emoticonos, enlaces y menciones.
    - `ChatActions`: Menú contextual para moderación (borrar mensaje, banear usuario).
- **ChatInput**: Campo de texto para enviar mensajes. Soporta selector de plataforma y gestión de estados de envío.

### Gestión de Conexiones (`connections/`)

- **AddPlatformModal**: Ventana emergente que guía al usuario para vincular una nueva cuenta de streaming.
- **ConnectionItem**: Muestra el estado individual de una plataforma conectada (online/offline, número de espectadores, botón de desvincular).

---

## Prácticas de Componentes

1.  **Envoltorios de Errores (LocalErrorBoundary)**: Las secciones críticas del dashboard están envueltas en Error Boundaries locales. Esto permite que, si el chat falla, el resto del dashboard siga funcionando.
2.  **Memorización con `useMemo` y `useCallback`**: Los componentes del chat (Feed, Mensajes) utilizan memorización intensiva para evitar re-renders cuando llegan cientos de mensajes por segundo.
3.  **Animaciones con `framer-motion` o CSS puro**: Se utilizan transiciones suaves para la entrada y salida de mensajes, así como para la apertura de modales y menús laterales.
4.  **Soporte i18n**: Todos los componentes utilizan el hook `useTranslation` de `react-i18next` para evitar textos hardcodeados.
