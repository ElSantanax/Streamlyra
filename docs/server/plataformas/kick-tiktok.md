# Integración con Kick y TikTok

Kick y TikTok representan integraciones modernas que priorizan el tiempo real y la simplicidad de conexión (especialmente en TikTok, que no requiere OAuth tradicional).

## Kick: Sockets y Webhooks

Kick utiliza un sistema híbrido muy eficiente:

### Chat en Tiempo Real

- Basado en **Websockets (vía Pusher)**.
- Permite recibir mensajes de chat con latencia milimétrica.
- El servidor se conecta al canal mediante el `slug` del usuario.

### Webhooks y Polling

- **Webhooks**: Utilizamos webhooks para eventos administrativos y de sistema.
- **Visualizaciones**: Implementamos un sondeo de espectadores (`Viewer Polling`) para mantener actualizado el contador de personas en vivo en el dashboard.

## TikTok: Auto-Discovery

La integración con TikTok destaca por su facilidad de uso para el streamer, basada en el popular conector de la comunidad.

### Eventos en Tiempo Real

La integración con TikTok de Streamlyra es una de las más completas, capturando una amplia gama de interacciones en vivo:

1.  **Chat**: Mensajes estándar y emoticonos nativos de TikTok.
2.  **Regalos (Gifts)**: Detecta el envío de regalos, incluyendo el nombre del regalo y la cantidad (multiplicador de repetición).
3.  **Seguidores**: Notificaciones inmediatas cuando alguien sigue al streamer.
4.  **Suscripciones**: Soporte para detectar nuevos suscriptores de la comunidad.
5.  **Cofres del Tesoro (Envelopes)**: Captura cuando se sueltan cofres en el chat, incluyendo la cantidad de diamantes si está disponible.

### Gestión de Estado e Auto-Discovery

1.  **Búsqueda Continua**: El sistema intenta conectarse al nombre de usuario proporcionado.
2.  **Auto-Discovery**: Si el streamer no está en vivo, el sistema entra en un modo de espera inteligente (`searching`), intentando reconectar automáticamente cuando detecta actividad.
3.  **Manual Boost**: Permite al usuario forzar una búsqueda inmediata desde el dashboard si el sistema automático aún no ha detectado el inicio del directo.
4.  **Evitar Duplicidad**: El `TikTokConnectionStateManager` asegura que no haya múltiples conexiones abiertas para un mismo usuario, optimizando el consumo de recursos.