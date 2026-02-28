# Plan de Test Coverage - Priorización

**Coverage Actual: 24.77%**  
**Meta Sugerida: 50-60% (enfocado en áreas críticas)**

---

## 🎯 Prioridad Alta - Impacto Crítico

### ✅ 1. Rutas y Endpoints (100% COMPLETADO)
```
✓ src/routes/auth.routes.ts           (100% - 8 tests)
✓ src/routes/webhook.routes.ts        (100% - 4 tests)
✓ src/routes/index.ts                 (100% - 4 tests)
```
**Estado**: COMPLETADO - 16 tests creados  
**Coverage**: 100% statements, 100% branches  
**Tipo de tests**: Integración con supertest

---

### ✅ 2. WebSocket Handlers (70%+ COMPLETADO)
```
✓ src/socket/handlers/MessageSocketHandler.ts      (84% - 5 tests)
✓ src/socket/handlers/ModerationSocketHandler.ts   (84% - 4 tests)
✓ src/socket/handlers/ConnectionSocketHandler.ts   (48% - 5 tests)
✓ src/socket/socket.handler.ts                     (86% - 3 tests)
```

**Servicios de Socket (70%+ COMPLETADO)**
```
✓ src/socket/services/SocketConnectionManager.ts   (72% - 4 tests)
✓ src/socket/services/SocketRegistry.ts            (71% - 5 tests)
✓ src/socket/utils/SocketErrorHandler.ts           (86% - 4 tests)
```

**Estado**: COMPLETADO - 30 tests creados  
**Coverage**: 72% handlers, 69% services, 86% utils  
**Tipo de tests**: Unit con mocks tipados

**Pendiente (Prioridad Baja)**:
```
- src/socket/handlers/moderation/strategies/* (18-20% coverage)
- src/socket/validators/SocketValidators.ts (74% coverage)
```

---

### 3. Core Business Logic (6-36% → 70%+)

**Stream y Analytics**
```
src/services/core/StreamSessionManager.ts          (6.89%)
src/services/core/AnalyticsService.ts              (0%)
src/services/core/ChatManager.ts                   (100% ✓ mantener)
```

**Gestión de Conexiones**
```
src/services/connection/ConnectionService.ts        (100% ✓)
src/services/connection/TokenRefreshService.ts      (92.77% - mejorar edges)
```

**Justificación**: Corazón de la aplicación. Alta complejidad lógica.  
**Tipo de tests**: Unit con mocks de servicios externos  
**Estimación**: 3-4 días

---

## ⚡ Prioridad Media - Alto ROI

### 4. Platform Services (16-33% → 60%+)

**Servicios Principales**
```
src/services/platforms/TwitchService.ts            (17.14%)
src/services/platforms/KickService.ts              (33.33%)
src/services/platforms/YouTubeService.ts           (66.66%)
src/services/platforms/YouTubeQuotaManager.ts      (4.12%)
src/services/platforms/TwitchEventSubClient.ts     (0%)
```

**Servicios Específicos de YouTube**
```
src/services/platforms/youtube/YouTubeLiveChatService.ts     (11.94%)
src/services/platforms/youtube/YouTubeProfileService.ts      (25.8%)
src/services/platforms/youtube/YouTubeQuotaErrorHandler.ts   (33.33%)
src/services/platforms/youtube/YouTubeTokenDecoder.ts        (14.28%)
```

**Justificación**: Integración con APIs externas. Alto riesgo de cambios.  
**Tipo de tests**: Unit con mocks de APIs, manejo de rate limits  
**Estimación**: 4-5 días

---

### 5. Webhook Processors (0% → 65%+)
```
src/services/webhook/WebhookProcessor.ts
src/services/webhook/WebhookProcessorFactory.ts
src/services/webhook/processors/KickWebhookProcessor.ts
src/services/webhook/processors/TwitchWebhookProcessor.ts
src/services/webhook/processors/YouTubeWebhookProcessor.ts
```

**Middleware de Webhooks**
```
src/middleware/webhooks/kick.middleware.ts
src/middleware/webhooks/twitch.middleware.ts
src/middleware/webhooks/youtube.middleware.ts
src/middleware/webhooks/utils.ts
```

**Justificación**: Manejo de eventos externos críticos. Validación de firmas.  
**Tipo de tests**: Unit + integración con payloads reales  
**Estimación**: 3-4 días

---

### 6. Chat Providers (0% → 60%+)

**Twitch**
```
src/services/chat/twitch/TwitchChatProvider.ts
src/services/chat/twitch/TwitchConnectionManager.ts
src/services/chat/twitch/TwitchEventListener.ts
src/services/chat/twitch/TwitchManager.ts
src/services/chat/twitch/TwitchWebhookService.ts
```

**Kick**
```
src/services/chat/kick/KickChatProvider.ts
src/services/chat/kick/KickManager.ts
src/services/chat/kick/KickWebhookService.ts
```

**TikTok**
```
src/services/chat/tiktok/TikTokChatProvider.ts
src/services/chat/tiktok/TikTokConnectionManager.ts
src/services/chat/tiktok/TikTokConnectionStateManager.ts
src/services/chat/tiktok/TikTokDiscoveryManager.ts
src/services/chat/tiktok/TikTokErrorHandler.ts
src/services/chat/tiktok/TikTokEventListener.ts
```

**YouTube**
```
src/services/chat/youtube/YouTubeChatProvider.ts
src/services/chat/youtube/YouTubeBroadcastDiscovery.ts
src/services/chat/youtube/YouTubeChatPoller.ts
src/services/chat/youtube/YouTubeConnectionStateManager.ts
src/services/chat/youtube/YouTubeDiscoveryLoop.ts
src/services/chat/youtube/YouTubePubSubParser.ts
src/services/chat/youtube/YouTubePubSubService.ts
src/services/chat/youtube/YouTubeViewerPoller.ts
```

**Shared**
```
src/services/chat/shared/PollingManager.ts
```

**Justificación**: Core de streaming. Múltiples estados y conexiones.  
**Tipo de tests**: Unit con mocks de WebSocket/polling  
**Estimación**: 5-6 días

---

### 7. Message Sending (35% → 70%+)
```
src/services/message/MessageSenderService.ts       (62.5%)
src/services/message/PlatformSendHelper.ts         (8%)
```

**Justificación**: Funcionalidad crítica de usuario. Manejo de errores importante.  
**Tipo de tests**: Unit con mocks de APIs  
**Estimación**: 2 días

---

## 🔧 Prioridad Baja - Menos Urgente

### 8. Transformers (60% → 80%+)
```
src/services/chat/transformers/BaseEventTransformer.ts      (33.33%)
src/services/chat/transformers/KickEventTransformer.ts      (97.43% ✓)
src/services/chat/transformers/TikTokEventTransformer.ts    (0%)
src/services/chat/transformers/TwitchEventTransformer.ts    (95.23% ✓)
src/services/chat/transformers/YouTubeEventTransformer.ts   (95.65% ✓)
```

**Justificación**: Algunos ya tienen buen coverage. Priorizar TikTok.  
**Estimación**: 1-2 días

---

### 9. User & Auth Services (7-62% → 60%+)
```
src/services/user/UserService.ts                           (7.24%)
src/services/auth/AuthDTOBuilder.ts                        (0%)
src/services/auth/core/PlatformAuthHandler.ts              (15.15%)
src/services/auth/core/UserProfileService.ts               (14.28%)
```

**Justificación**: Algunos componentes auth ya tienen buen coverage (AuthService 100%).  
**Estimación**: 2-3 días

---

### 10. Utils y Helpers
```
src/utils/SafeSocketEmitter.ts          (9.25%)
src/utils/SentMessageCache.ts           (10.63%)
src/utils/oauth.utils.ts                (12.5%)
src/utils/retryWithInterval.ts          (0%)
```

**Justificación**: Importante pero menos crítico que lógica de negocio.  
**Estimación**: 1-2 días

---

### 11. Middleware Faltante (0% → 50%+)
```
src/middleware/csrf.middleware.ts
src/middleware/rateLimit.middleware.ts
```

**Justificación**: Seguridad importante pero menos prioritario que features core.  
**Estimación**: 1 día

---

### 12. App Entry Points (0% → 40%+)
```
src/app.ts
src/server.ts
src/index.ts
```

**Justificación**: Principalmente setup. Menos lógica crítica.  
**Tipo de tests**: Smoke tests básicos  
**Estimación**: 1 día

---

## ✅ Áreas con Buen Coverage (Mantener)

**No necesitan atención inmediata:**
```
✓ src/models/*                          (100%)
✓ src/controllers/*                     (95.34%)
✓ src/middleware/auth.middleware.ts     (92.3%)
✓ src/middleware/error.middleware.ts    (100%)
✓ src/middleware/zod.middleware.ts      (100%)
✓ src/config/validation.ts              (100%)
✓ src/services/security/*               (100%)
✓ src/services/moderation/*             (81%)
✓ src/repositories/implementations/*    (84.49%)
```

---

## 📊 Plan de Ejecución Sugerido

### ✅ Sprint 1 (COMPLETADO): Fundaciones
- ✅ Rutas y endpoints (100%)
- ✅ WebSocket handlers básicos (70%+)
- ✅ Servicios de socket (70%+)
- **Resultado**: 46 tests creados, coverage crítico 70%+

### Sprint 2 (Semana 3-4): Core Business
- ✅ StreamSessionManager
- ✅ AnalyticsService
- ✅ Webhook processors
- **Objetivo**: 45% coverage global

### Sprint 3 (Semana 5-6): Platform Integration
- ✅ Platform services (Twitch, Kick, YouTube)
- ✅ Chat providers
- **Objetivo**: 55% coverage global

### Sprint 4 (Semana 7-8): Polish
- ✅ Message sending
- ✅ Transformers faltantes
- ✅ Utils críticos
- **Objetivo**: 60% coverage global

---

## 🎯 Meta Final

**Coverage Global**: 55-60%  
**Coverage Crítico** (rutas, handlers, core services): 70%+  
**Tiempo Estimado**: 6-8 semanas

---

## 📝 Notas Importantes

1. **Priorizar calidad sobre cantidad**: Mejor 60% de tests útiles que 90% de tests frágiles
2. **Enfoque en edge cases**: Errores de red, rate limits, tokens expirados
3. **Mocks estratégicos**: APIs externas, WebSockets, bases de datos
4. **Tests de integración**: Al menos 1 test E2E por flujo crítico
5. **CI/CD**: Configurar threshold mínimo de 50% para PRs nuevos

---

## 🚀 Para Empezar

**Comando de test con coverage:**
```bash
npm run test:coverage
```

**Ver reporte HTML:**
```bash
open coverage/lcov-report/index.html
```

**Test específico:**
```bash
npm test -- src/routes/auth.routes.test.ts
```
