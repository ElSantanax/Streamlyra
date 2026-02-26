# 🧪 Prioridades de Testing - Server

## Tabla de Prioridades

| Prioridad | Área | Archivos | Cobertura Actual | Razón |
|-----------|------|----------|------------------|-------|
| ✅ **CRÍTICA** | **Autenticación** | `auth.middleware.ts` | 95%+ | Seguridad - completado |
| ✅ **CRÍTICA** | **Autenticación** | `AuthService.ts` | 80%+ | Lógica de negocio crítica - completado |
| ✅ **CRÍTICA** | **Autenticación** | `AuthFlowProcessor.ts` | 80%+ | Flujos de OAuth complejos - completado |
| ✅ **CRÍTICA** | **Autenticación** | `TokenService.ts` | 100% | Gestión de tokens JWT - completado |
| ✅ **CRÍTICA** | **Autenticación** | `TokenRefreshService.ts` | 92%+ | Renovación automática de tokens - completado |
| ✅ **CRÍTICA** | **Seguridad** | `EncryptionService.ts` | 100% | Cifrado de datos sensibles - completado |
| ✅ **CRÍTICA** | **Seguridad** | `SocketAuthMiddleware.ts` | 100% | Autenticación WebSocket - completado |
| ✅ **CRÍTICA** | **Validación** | `validation.ts` | 100% | Validación de inputs - completado |
| ✅ **CRÍTICA** | **Validación** | `zod.middleware.ts` | 100% | Sanitización de datos - completado |
| ✅ **CRÍTICA** | **Validación** | `ModerationValidator.ts` | 100% | Validación de moderación - completado |
| 🟡 **ALTA** | **Core Business** | `ChatManager.ts` | 0% | Orquestación de chat multi-plataforma |
| 🟡 **ALTA** | **Core Business** | `ConnectionService.ts` | 0% | Gestión de conexiones |
| 🟡 **ALTA** | **Core Business** | `MessageSenderService.ts` | 0% | Envío de mensajes crítico |
| 🟡 **ALTA** | **Repositorios** | `ConnectionRepository.ts` | 0% | Acceso a datos principal |
| 🟡 **ALTA** | **Repositorios** | `UserRepository.ts` | 0% | Operaciones de usuario |
| 🟡 **ALTA** | **Transformers** | `KickEventTransformer.ts` | 0% | Normalización de eventos |
| 🟡 **ALTA** | **Transformers** | `TwitchEventTransformer.ts` | 0% | Normalización de eventos |
| 🟡 **ALTA** | **Transformers** | `YouTubeEventTransformer.ts` | 0% | Normalización de eventos |
| 🟡 **ALTA** | **Error Handling** | `error.middleware.ts` | 0% | Manejo centralizado de errores |
| 🟡 **ALTA** | **Error Handling** | `errorHandling.ts` | 0% | Utils de error handling |
| 🟢 **MEDIA** | **Controllers** | `auth.controller.ts` | 0% | Endpoints HTTP (menos crítico) |
| 🟢 **MEDIA** | **Controllers** | `webhook.controller.ts` | 0% | Webhooks de plataformas |
| 🟢 **MEDIA** | **Moderation** | `*ModerationService.ts` | 0% | Servicios de moderación |
| 🟢 **MEDIA** | **Platform Services** | `*Service.ts` | 0% | Integraciones con APIs |
| ⚪ **BAJA** | **Config** | `db.ts` | 0% | Configuración de DB |
| ⚪ **BAJA** | **Models** | `*.model.ts` | 0% | Schemas de Mongoose |
| ⚪ **BAJA** | **Constants** | `platforms.ts`, `*-emotes.ts` | 0% | Datos estáticos |
| ⚪ **BAJA** | **Index Files** | `index.ts` (todos) | 0-100% | Solo exports |
| ⚪ **BAJA** | **Managers** | Platform-specific managers | 0% | Lógica de terceros |
| ❌ **NO TESTEAR** | **Entry Points** | `app.ts`, `server.ts`, `index.ts` | 0% | Inicialización de app |
| ❌ **NO TESTEAR** | **Utils** | `logger.ts` | 0% | Logger wrapper |

---

## 📊 Resumen de Cobertura Recomendada

| Prioridad | Archivos | Objetivo de Cobertura |
|-----------|----------|----------------------|
| 🔴 **Crítica** | 10 archivos | 80-90% |
| 🟡 **Alta** | 10 archivos | 70-80% |
| 🟢 **Media** | 8 archivos | 50-60% |
| ⚪ **Baja** | Opcional | 30-40% |
| ❌ **No testear** | Ignorar | - |

---

## 📅 Plan de Implementación Sugerido

### Semana 1: Seguridad y Autenticación
- ✅ Completar `auth.middleware.ts` (de 92% a 95%+)
- 🔒 `AuthService.ts`
- 🔒 `TokenService.ts`
- 🔒 `EncryptionService.ts`

### Semana 2: Validación y Repositorios
- ✅ Mejorar `validation.ts` (de 63% a 80%+)
- 📝 `zod.middleware.ts`
- 📝 `ModerationValidator.ts`
- 💾 `ConnectionRepository.ts`
- 💾 `UserRepository.ts`

### Semana 3: Core Business Logic
- 💬 `ChatManager.ts`
- 📨 `MessageSenderService.ts`
- 🔗 `ConnectionService.ts`
- 🔄 `TokenRefreshService.ts`

### Semana 4: Transformers y Error Handling
- 🔄 Event Transformers (Kick, Twitch, YouTube)
- ⚠️ `error.middleware.ts`
- ⚠️ `errorHandling.ts`
- 🔌 `SocketAuthMiddleware.ts`

---

## 🎯 Criterios de Éxito

### Cobertura Global Objetivo
```
Statements   : 60-70%
Branches     : 55-65%
Functions    : 60-70%
Lines        : 60-70%
```

### Por Categoría
- **Autenticación/Seguridad**: >85%
- **Validación**: >80%
- **Core Business**: >70%
- **Transformers**: >70%
- **Repositorios**: >75%

---

## 💡 Notas Importantes

1. **No testear archivos de configuración estática** - No aportan valor real
2. **Priorizar tests unitarios** sobre integración en primera fase
3. **Mockear llamadas externas** (APIs de Twitch, YouTube, Kick)
4. **Focus en happy path + error cases** más comunes
5. **Usar factories/fixtures** para datos de prueba reutilizables

---

## 🚀 Próximos Pasos

1. [ ] Configurar ambiente de testing (Jest configurado ✅)
2. [ ] Crear carpeta `/tests` con estructura espejo de `/src`
3. [ ] Implementar test factories/mocks comunes
4. [ ] Comenzar con Semana 1 del plan
5. [ ] Configurar CI/CD para ejecutar tests automáticamente
6. [ ] Establecer threshold mínimo de cobertura (ej: 60%)

---

**Última actualización**: ${new Date().toLocaleDateString('es-ES')}
