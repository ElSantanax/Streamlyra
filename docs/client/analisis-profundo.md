# Análisis Profundo del Cliente (Frontend)

Este documento detalla el funcionamiento interno de las piezas clave del cliente de Streamlyra y cómo interactúan entre sí.

---

## Ciclo de Vida de Autenticación (`AuthProvider`)

La autenticación es el pilar del cliente. Este es el flujo detallado:

1.  **Arranque (`Bootstrap`)**: En `main.tsx` se monta la aplicación. `AuthProvider` verifica el `localStorage`.
2.  **Validación**: Si hay un usuario en el `storage`, el hook `useAuth` inicia una llamada a `authService.getMe()`.
    - Si el servidor responde con los datos del usuario, el estado cambia a `authenticated`.
    - Si el servidor devuelve un error 401 (token expirado), se limpia el `storage` y el estado pasa a `unauthenticated`.
3.  **Redirección**: El componente `ProtectedRoute` observa este estado:
    - Mientras el estado es `unknown` (validando), muestra el `Spinner`.
    - Si es `unauthenticated`, redirige automáticamente a la página de inicio o login.
4.  **Gestión de Sesión**: Un singleton (`SessionManager`) escucha errores 401 en cualquier parte de la app para forzar el logout si el token es invalidado por el servidor durante el uso.

---

## Comunicación en Tiempo Real

Streamlyra utiliza una arquitectura híbrida entre HTTP (REST) y Sockets (Socket.io).

### El Hook `useSocket`
Es el puente entre el servidor y la interfaz. Se encarga de:
- **Autenticación del Canal**: Cuando el usuario entra al Dashboard, el socket se conecta enviando las credenciales de sesión.
- **Normalización**: Recibe eventos crudos del servidor y los transforma si es necesario antes de disparar callbacks.
- **Resiliencia**: Si la conexión se pierde, el Dashboard muestra un indicador visual (de `DashboardHeader`) y el hook intenta reconectar automáticamente.

---

### Procesamiento del Chat Unificado

Este es el flujo por el que pasa un mensaje desde que llega hasta que se renderiza:

1.  **Evento de Socket**: El servidor emite `chat_message`.
2.  **Hook `useSocket`**: Recibe el mensaje crudo.
3.  **Store `useChatStore` (Zustand)**: El mensaje se inyecta en el store global.
    - **Batching**: Los mensajes se agrupan en micro-lotes para evitar ráfagas que congelen la UI.
    - **Retención Inteligente**: Se mantiene un límite estricto (ej: 200 mensajes) mediante un recorte automático del estado de Zustand.
4.  **Componente `ChatFeed`**: React re-renderiza solo el área de mensajes observando los cambios atómicos del store.
5.  **Transformación Visual**: `MessageContent` traduce emotes y enlaces en tiempo real.

---

## Gestión de Conexiones (`useConnectionsStore`)

Gestionar múltiples plataformas simultáneamente requiere una sincronización atómica:

1.  **Inicialización**: Se cargan las conexiones desde la API y se inyectan en el store de Zustand.
2.  **Sincronización de Estados**: El store maneja estados complejos como `searching` (buscando en vivo) o `waiting_stream`.
3.  **Protección de Datos (Cache Logic)**: El sistema detecta si un dato proviene de un Polling (API) o un Push (Socket), evitando que una respuesta lenta de la API sobrescriba un estado más reciente del Socket (ej: que un "Offline" viejo pise un "Online" nuevo).
4.  **Rendimiento**: Gracias a Zustand, las estadísticas (viewers, followers) se actualizan en componentes específicos sin re-renderizar todo el Dashboard.

---

## Calidad y Pruebas con `Fast-Check`

A diferencia de las pruebas unitarias tradicionales que usan un solo ejemplo de prueba, en Streamlyra usamos **Pruebas Basadas en Propiedades** (PBT) en el frontend:

- **Escenario**: Probar que el formateador de mensajes no rompa la UI con caracteres extraños.
- **Lógica**: `fast-check` genera cadenas aleatorias de texto, incluyendo emojis, caracteres Unicode, enlaces malformados y scripts.
- **Garantía**: Si el componente sobrevive a miles de estas entradas aleatorias sin lanzar excepciones, consideramos que es robusto.

---

## Diseño y Estética

La UI sigue un patrón de **"Glassmorphism"** moderado:
- **Colores**: Usamos una paleta oscura (`zinc-950`) con acentos en púrpura (`violet-600`) para la marca.
- **Feedback Visual**: Cada baneo o borrado de mensaje muestra una notificación (Toast) para confirmar que la acción de moderación fue exitosa.
- **Overlays**: La página `/overlay/chat` está diseñada para ser 100% transparente para que no bloquee el video en OBS.

---

ElSantana
