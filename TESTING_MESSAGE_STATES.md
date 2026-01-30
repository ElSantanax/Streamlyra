# Testing Message States (Estados de Mensaje)

## Requisitos
1. Servidor corriendo: `cd server && npm run dev`
2. Cliente corriendo: `cd client && npm run dev`
3. Usuario autenticado en el dashboard

## Escenarios de Prueba

### 1. Mensaje Exitoso (Estado: sending → sent)

**Pasos:**
1. Abrir http://localhost:5173/dashboard
2. Conectar al menos una plataforma (Twitch, YouTube, o Kick)
3. Escribir un mensaje: "Hola mundo"
4. Presionar Enviar

**Resultado esperado:**
- El mensaje aparece INMEDIATAMENTE con indicador "Enviando..." (icono de reloj animado)
- Después de 1-3 segundos, el indicador cambia a "Enviado" (check verde)

---

### 2. Error Total (Estado: sending → error)

**Opción A: Desconectar todas las plataformas**

**Pasos:**
1. En el dashboard, desconectar TODAS las plataformas
2. Escribir un mensaje: "Test error"
3. Presionar Enviar

**Resultado esperado:**
- El mensaje aparece con "Enviando..."
- Después de 1-2 segundos, cambia a "Error" (icono rojo)
- Hover sobre el error muestra: "No se pudo enviar a ninguna plataforma"

**Opción B: Tokens inválidos**

**Pasos:**
1. En la base de datos, corromper los tokens de las plataformas conectadas
2. Enviar un mensaje
3. Ver el estado cambiar a "Error"

---

### 3. Error Parcial (Estado: sending → error con detalles)

**Pasos:**
1. Conectar múltiples plataformas (ej: Twitch + YouTube + Kick)
2. Corromper el token de UNA plataforma en la base de datos
3. Enviar un mensaje: "Test error parcial"

**Resultado esperado:**
- El mensaje aparece con "Enviando..."
- Después de 1-3 segundos, cambia a "Error" (icono rojo)
- Hover sobre el error muestra: "Falló en: youtube" (o la plataforma que falló)
- Toast de warning muestra: "Mensaje enviado a twitch, kick. Falló en: youtube"

---

### 4. Pérdida de Conexión (Simular internet caído)

**Opción A: Desconectar WiFi**

**Pasos:**
1. Enviar un mensaje exitoso primero (para verificar que funciona)
2. Desconectar el WiFi/Internet
3. Escribir un mensaje: "Sin internet"
4. Presionar Enviar

**Resultado esperado:**
- Toast de error: "No hay conexión con el servidor"
- El mensaje NO aparece en el chat (porque el socket no está conectado)

**Opción B: Detener el servidor**

**Pasos:**
1. Detener el servidor (Ctrl+C en la terminal del servidor)
2. En el dashboard, escribir un mensaje
3. Presionar Enviar

**Resultado esperado:**
- Toast de error: "No hay conexión con el servidor"
- El mensaje NO aparece en el chat

---

### 5. Múltiples Mensajes Rápidos

**Pasos:**
1. Enviar 5 mensajes seguidos rápidamente:
   - "Mensaje 1"
   - "Mensaje 2"
   - "Mensaje 3"
   - "Mensaje 4"
   - "Mensaje 5"

**Resultado esperado:**
- Todos los mensajes aparecen con "Enviando..."
- Uno por uno van cambiando a "Enviado" (verde)
- No hay duplicados
- Todos terminan con estado "Enviado"

---

## Verificación Visual

### Estado "Enviando"
```
[Reloj animado] Enviando...
Color: Gris (text-gray-400)
```

### Estado "Enviado"
```
(No se muestra nada)
El usuario asume que si no hay error, el mensaje se envió correctamente
```

### Estado "Error"
```
[X rojo] Error
Color: Rojo (text-red-500)
Tooltip: Muestra el mensaje de error al hacer hover
```

---

## Debugging

### Ver eventos del socket en el navegador

Abrir DevTools → Console y ejecutar:

```javascript
// Ver todos los eventos del socket
const socket = window.io?.connect?.() || window.socket;
socket.onAny((event, ...args) => {
  console.log('Socket event:', event, args);
});
```

### Ver mensajes en el estado de React

Abrir React DevTools → Components → Dashboard → hooks → useChatMessages → messages

---

## Casos Edge

### 1. Servidor lento (> 5 segundos)
- El mensaje debe permanecer en "Enviando..." hasta que llegue la respuesta
- No debe timeout

### 2. Reconexión después de pérdida
- Desconectar internet
- Reconectar internet
- El socket debe reconectarse automáticamente
- Los nuevos mensajes deben funcionar normalmente

### 3. Mensaje vacío
- Escribir solo espacios
- Presionar Enviar
- Toast de error: "El mensaje no puede estar vacío"
- No se crea ningún mensaje en el chat

---

## Automatización con Cypress (Futuro)

Para automatizar estos tests, necesitarías:

1. Mockear el socket.io en Cypress
2. Simular eventos `chat_message` con diferentes estados
3. Simular eventos `message_status_update`
4. Verificar que los indicadores visuales aparecen correctamente

Esto requiere configuración avanzada de Cypress con socket.io mocking.
