# Auditoría de Rendimiento y Código Muerto - Streamlyra Server

## 🔴 Prioridad Alta: Críticos y Rendimiento

- [x] **Memory Leak en MessageBatcher**: El `Map` de colas no elimina las entradas de usuarios desconectados, solo vacía sus arrays. (Arreglado: se usa `delete` en el flush)
- [x] **Sobrecarga en Hot Path (SafeSocketEmitter)**: Generación innecesaria de arrays desde `rooms.keys()` en cada mensaje emitido. (Arreglado: eliminado Array.from costoso)
- [x] **Latencia de Red en TwitchManager**: Registro de webhooks paralelo y eliminación de patrón N+1 query en el startup. (Arreglado: Promise.all y find batch)

## 🟡 Prioridad Media: Optimización y Estructura

- [ ] **Redundancia en YouTubeQuotaManager**: Doble llamada a inicialización y verificación de fecha en cada operación de cuota.
- [ ] **Duplicación en AnalyticsService**: Constante de expiración (7 días) definida múltiples veces y lógica de consulta repetida.
- [ ] **Estado duplicado en SocketConnectionManager**: El Set `connectedUsers` es redundante con la información ya gestionada por `SocketRegistry`.
- [ ] **Doble Query en KickChatProvider**: Consultas consecutivas a la base de datos por el mismo objeto de conexión en el flujo de inicio.
- [ ] **Seguridad de Flujo en TikTokDiscoveryManager**: El `flowId` generado tiene poca entropía, aumentando el riesgo de colisiones en reconexiones masivas.
- [ ] **Timer Leak en WebhookCache**: El `setInterval` de limpieza no tiene referencia guardada, imposibilitando su detención.

## 🟢 Prioridad Baja: Limpieza de Código

- [ ] **Lógica Muerta en YouTubeChatProvider**: Función de cleanup de descubrimiento vacía que se ejecuta innecesariamente.
- [ ] **Listener Innecesario en TikTokEventListener**: Registro del evento 'like' sin ninguna implementación.
- [ ] **Tipado Redundante en MessageSocketHandler**: Cast `as string` innecesario en variables ya tipadas.
- [ ] **Anti-patrón en PollingManager**: Uso de un `setTimeout` de 0ms como placeholder de inicialización.
- [ ] **Redundancia en Services**: Doble referencia (propiedad de clase vs import) del singleton de encriptación en múltiples servicios.
- [ ] **Hardcoding en Discovery Loop**: Intervalos de espera definidos localmente en lugar de usar el archivo de configuración central.

ElSantana
