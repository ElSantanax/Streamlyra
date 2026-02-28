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

### Funcionamiento del Conectar

1. **Búsqueda**: El sistema intenta conectarse al nombre de usuario proporcionado.
2. **Auto-Discovery**: Si el streamer no está en vivo, el sistema entra en un modo de espera inteligente, intentando reconectar cada cierto tiempo sin intervención del usuario.
3. **Eventos**: Captura no solo el chat, sino también regalos, compartidos y nuevos seguidores de forma unificada.

### Gestión de Estado

Tanto Kick como TikTok utilizan un `StateManager` específico que asegura que no haya múltiples conexiones abiertas para un mismo usuario, evitando duplicidad de mensajes y consumo innecesario de memoria en el servidor.

---

ElSantana
