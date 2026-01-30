# Test Rápido - Estados de Mensaje

## Setup Rápido (2 minutos)

### Terminal 1 - Servidor
```bash
cd server
npm run dev
```

### Terminal 2 - Cliente
```bash
cd client
npm run dev
```

### Terminal 3 - Abrir navegador
```bash
# Abrir http://localhost:5173
```

---

## Test 1: Mensaje Exitoso ✅ (30 segundos)

1. Login en el dashboard
2. Conectar una plataforma (cualquiera)
3. Escribir: "Test 1"
4. Enviar

**✅ Debe ver:**
- Mensaje aparece con "Enviando..." (reloj gris)
- Después de 1-3 segundos, el indicador desaparece (mensaje enviado exitosamente)

---

## Test 2: Error por Desconexión ❌ (30 segundos)

1. En el dashboard, desconectar TODAS las plataformas
2. Escribir: "Test 2"
3. Enviar

**✅ Debe ver:**
- Mensaje aparece con "Enviando..."
- Cambia a "Error" (X rojo) en 1-2 segundos
- Hover sobre "Error" muestra el mensaje de error

---

## Test 3: Sin Internet 🌐 (30 segundos)

1. Detener el servidor (Ctrl+C en Terminal 1)
2. Escribir: "Test 3"
3. Enviar

**✅ Debe ver:**
- Toast rojo: "No hay conexión con el servidor"
- El mensaje NO aparece en el chat

---

## Test 4: Múltiples Mensajes 🚀 (1 minuto)

1. Reiniciar servidor
2. Conectar una plataforma
3. Enviar 5 mensajes rápidamente:
   - "A"
   - "B"
   - "C"
   - "D"
   - "E"

**✅ Debe ver:**
- Todos aparecen con "Enviando..."
- Los indicadores desaparecen cuando se envían exitosamente
- No hay duplicados
- Orden correcto: A, B, C, D, E

---

## ¿Qué buscar?

### ✅ Correcto
- Indicador "Enviando..." aparece inmediatamente
- Indicador desaparece cuando se envía exitosamente
- Indicador "Error" aparece solo cuando falla
- No hay duplicados
- Input se limpia inmediatamente

### ❌ Incorrecto
- Mensaje no aparece
- Indicador se queda en "Enviando..." para siempre
- Mensajes duplicados
- Input no se limpia

---

## Debug Rápido

Si algo no funciona:

1. **Abrir DevTools Console** (F12)
2. Buscar errores en rojo
3. Verificar que el socket está conectado:
   ```javascript
   // En la consola del navegador
   window.socket?.connected
   // Debe retornar: true
   ```

4. Ver logs del servidor en Terminal 1
5. Buscar errores de TypeScript o compilación

---

## Siguiente Paso

Si todos los tests pasan ✅, la funcionalidad está completa.

Si algún test falla ❌, revisar:
- Logs del servidor
- Console del navegador
- Network tab (WebSocket connection)
