# Archivos a Testear - Prioridad Crítica

## 🔐 Autenticación (6 archivos) ✅
```
src/lib/auth/oauth.ts ✅
src/lib/auth/pkce.ts ✅
src/context/AuthProvider.tsx ✅
src/services/api/auth.service.ts ✅
src/services/session/SessionManager.ts ✅
src/components/common/ProtectedRoute.tsx ✅
```

## ⚠️ Error Handling (3 archivos) ✅
```
src/lib/errors/errorHandler.ts ✅
src/components/common/GlobalErrorBoundary.tsx ✅
src/components/common/LocalErrorBoundary.tsx ✅
```

## 🔌 WebSocket (1 archivo) ✅
```
src/hooks/useSocket.ts ✅
```

## 💬 Chat Core (4 archivos) ✅
```
src/hooks/useChatMessages/useChatMessages.ts ✅
src/components/dashboard/chat/ChatInput/hooks/useMessageSender.ts ✅
src/components/dashboard/chat/ChatInput/hooks/useEmojiPicker.ts ✅
src/hooks/useModeration.ts ✅
```

## 🔗 Connections (3 archivos) ✅
```
src/hooks/useConnections/index.ts ✅
src/hooks/useConnections/useConnectionsApi.ts ✅
src/hooks/useConnections/useConnectionsSocket.ts ✅
```

## 🌐 API Client (1 archivo) ✅
```
src/services/api/client.ts ✅
```

## ✅ Validadores y Utils (3 archivos)
```
src/lib/validators/username.validator.ts
src/hooks/useLocalStorage.ts
src/components/dashboard/chat/ChatInput/utils/messageValidation.ts
```

---

## 📊 Resumen

**Total: 21 archivos**

### Fase 1 (Crítico) - 11 archivos ✅ (Completado)
- Auth: 6 archivos ✅
- Error Handling: 3 archivos ✅
- WebSocket: 1 archivo ✅
- API Client: 1 archivo ✅

### Fase 2 (Importante) - 7 archivos ✅ (Completado)
- Chat Core: 4 archivos ✅
- Connections: 3 archivos ✅

### Fase 3 (Nice to have) - 3 archivos
- Validadores y Utils: 3 archivos

---

## 🎯 Objetivo de Coverage por Fase

| Fase | Coverage Esperado | Archivos |
|------|------------------|----------|
| Fase 1 | 40-50% | 11 |
| Fase 2 | 60-70% | +7 |
| Fase 3 | 70-80% | +3 |

---

## 📝 Notas de Implementación

### Prioriza primero:
1. `src/lib/auth/oauth.ts` - Flujo crítico de login
2. `src/services/api/client.ts` - Base de todas las llamadas
3. `src/lib/errors/errorHandler.ts` - Manejo global de errores
4. `src/hooks/useSocket.ts` - Comunicación tiempo real
5. `src/hooks/useChatMessages/useChatMessages.ts` - Core del chat

### Testing Stack Recomendado:
- **Framework:** Vitest
- **React Testing:** @testing-library/react
- **Hooks Testing:** @testing-library/react-hooks
- **Mocks:** msw (API), vi.mock (modules)
