# 🚀 Reporte de Análisis de Rendimiento y Optimización - Streamlyra Server

Este documento recopila los hallazgos de dos análisis exhaustivos realizados sobre el código fuente en `server/src`. Las recomendaciones están categorizadas por nivel de prioridad e impacto en el sistema.

---

## 📋 Resumen Ejecutivo

El código base muestra una arquitectura sólida con buenos patrones de diseño (Repository Pattern, Dependency Injection, Factory Pattern). Sin embargo, se han identificado **12 áreas clave de mejora**, siendo **3 de ellas críticas** para la estabilidad y escalabilidad bajo carga.

---

## 🔴 PRIORIDAD: CRÍTICA (Implementar Inmediatamente)

Estas mejoras abordan problemas que pueden causar caídas del servidor, corrupción de datos o latencia severa.

### 1. 🗄️ Repositorio de Conexiones - Fix de "Auto-Migración"
**Archivo:** `repositories/implementations/ConnectionRepository.ts`

**Problema:**
El método `decryptConnection` detecta tokens no encriptados y ejecuta un `save()` automático en ese momento.
- **Riesgo:** Genera condiciones de carrera, bloqueos en BD y múltiples escrituras innecesarias (problema N+1) cada vez que se lee una conexión antigua.

**Solución Recomendada:**
Eliminar la lógica de auto-guardado en tiempo de lectura. Usar un script de migración batch dedicado.

```typescript
// En lugar de guardar en decryptConnection:
// private decryptConnection(...) { ... solo desencriptar en memoria ... }

// Crear script scripts/migrate-tokens.ts para ejecutar una sola vez
```

### 2. 📡 Socket Handler - Cola de Mensajería Asíncrona
**Archivo:** `socket/socket.handler.ts`

**Problema:**
El evento `send_message` utiliza `await` para esperar la respuesta de todas las plataformas externas (puede tomar 5-10 segundos).
- **Riesgo:** Bloquea el hilo de eventos del socket para ese usuario, impidiendo otras interacciones.

**Solución Recomendada:**
Implementar una cola de trabajos (Bull / BullMQ) para procesar los envíos en background.

```typescript
// socket.handler.ts
messageQueue.add('send', { userId, message, ... }); // Retorna inmediatamente
```

### 3. 🔐 Token Refresh - Prevención de Bucles y Cooldown
**Archivo:** `services/connection/TokenRefreshService.ts`

**Problema:**
Si un refresh de token falla, el caché de promesas se limpia inmediatamente.
- **Riesgo:** Ante un fallo masivo de una plataforma (ej. Twitch caído), miles de usuarios intentarían refrescar tokens simultáneamente cada segundo ("thundering herd" repetitivo).

**Solución Recomendada:**
Implementar un "cooldown" de 5-10 segundos tras un fallo de refresh para evitar reintentos inmediatos.

---

## 🟡 PRIORIDAD: ALTA (Implementar Pronto)

Mejoras que optimizan significativamente el uso de recursos y la experiencia de usuario.

### 4. 🎛️ Configuración de Pool de Base de Datos
**Archivo:** `config/db.ts`

**Recomendación:**
Ajustar los parámetros para producción:
- `min: 2` (en lugar de 5): Ahorra recursos en inactividad.
- `idle: 20000`: Aumentar tiempo de vida de conexiones inactivas para evitar reconexiones frecuentes.

### 5. 💬 YouTube Poller - Límite de Ráfagas
**Archivo:** `services/chat/youtube/YouTubeChatPoller.ts`

**Problema:**
La distribución gradual divide `intervalo / mensajes`. Si llegan 100 mensajes, crea 100 timers instantáneos.

**Solución Recomendada:**
Limitar el buffer de distribución a máximo 50 mensajes. Los excedentes deben descartarse o enviarse en lote.

```typescript
if (messages.length > 50) {
    // Procesar solo los 50 más recientes para evitar saturación de memoria
    messages = messages.slice(0, 50);
}
```

### 6. 🔌 Chat Manager - Límite de Concurrencia
**Archivo:** `services/ChatManager.ts`

**Problema:**
Se conectan todas las plataformas de un usuario simultáneamente con `Promise.all`.

**Solución Recomendada:**
Usar una librería como `p-limit` para restringir la concurrencia (ej. máx 2 conexiones simultáneas por usuario) y evitar picos de CPU.

### 7. 🚀 Manejo de Promesas en Envíos Masivos
**Archivo:** `services/message/MessageSenderService.ts`

**Problema:**
Usa `Promise.all` para enviar a plataformas. Si una falla catastróficamente, puede cancelar las demás o complicar el manejo de errores parciales.

**Solución Recomendada:**
Cambiar a `Promise.allSettled` para garantizar que obtenemos el resultado individual de cada intento de envío.

---

## 🟢 PRIORIDAD: MEDIA/OPCIONAL (Optimizaciones)

Mejoras para cuando el sistema escale horizontalmente o tenga gran volumen.

### 8. 🛡️ SafeSocketEmitter - Cache de Rooms
**Archivo:** `utils/SafeSocketEmitter.ts`

**Optimización:**
La verificación `io.sockets.adapter.rooms.get(userId)` es costosa si se hace en cada emisión. Cachear el resultado por 1 segundo podría reducir carga de CPU en emisiones masivas.

### 9. 🧠 Cache de Mensajes Enviados - Algoritmo LRU
**Archivo:** `utils/SentMessageCache.ts`

**Optimización:**
El sistema actual es FIFO (First-In First-Out) por usuario. Cambiar a una estrategia LRU (Least Recently Used) real para gestionar mejor la memoria global del caché.

### 10. ⏱️ Timeouts Adaptativos para Sockets
**Archivo:** `socket/SocketConnectionManager.ts`

**Optimización:**
Usar un timeout corto (10s) para reconexiones rápidas y uno largo (30s) solo para la conexión inicial (login frío), mejorando la UX en reconexiones por inestabilidad de red.

### 11. 🔄 Transacciones de BD - Timeout de Seguridad
**Archivo:** `services/AuthService.ts`

**Optimización:**
Envolver las transacciones críticas (`db.transaction`) en un `Promise.race` con un timeout (ej. 10s) para evitar que bloqueos en la BD dejen requests colgados indefinidamente.

### 12. 📦 Rate Limiting Distribuido
**Archivo:** `middleware/rateLimit.middleware.ts`

**Optimización:**
Implementar un store de Redis (`rate-limit-redis`) en lugar de memoria local. Esencial si planeas desplegar múltiples instancias del servidor (cluster mode o Kubernetes).

---

## 📝 Plan de Acción Sugerido

1.  **Semana 1:** Implementar mejoras **CRÍTICAS (1, 2, 3)**.
    *   Crear script de migración de tokens.
    *   Configurar Bull/BullMQ para mensajería.
2.  **Semana 2:** Implementar mejoras de **PRIORIDAD ALTA (4, 5, 6, 7)**.
    *   Ajustar config de DB y lógicas de polling.
3.  **Futuro:** Abordar las optimizaciones restantes conforme la base de usuarios crezca.
