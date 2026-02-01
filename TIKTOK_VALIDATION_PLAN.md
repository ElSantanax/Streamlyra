# Propuesta de Validación de Cuentas de TikTok - Streamlyra

Este documento detalla las opciones analizadas para validar la propiedad de una cuenta de TikTok e implementar el flujo de autenticación oficial.

## 1. El Problema Actual
Actualmente, cualquier usuario puede ingresar cualquier `@username` de TikTok. Aunque la librería solo permite lectura (no envío de mensajes), esto genera:
*   **Falta de pertenencia:** El usuario no siente que la cuenta es "suya" en el sistema.
*   **Inconsistencia de datos:** Si un usuario cambia su `@username`, la conexión se rompe si no tenemos su `userId` único.
*   **Posible confusión:** Usuarios nuevos pueden creer que tienen permisos de escritura que no existen.

---

## 2. Opciones de Validación (Sin API Oficial)

Si queremos evitar el proceso burocrático de revisión de TikTok para desarrolladores, tenemos estas alternativas:

### A. Validación por Biografía (Bio)
*   **Flujo:** El sistema genera un código (ej: `LYRA-123`). El usuario lo pega en su perfil de TikTok.
*   **Pros:** Muy seguro y estándar en la industria.
*   **Contras:** Fricción para el usuario (debe editar su perfil).

### B. Validación por Comando en Vivo
*   **Flujo:** El usuario conecta su chat y debe escribir un comando específico (ej: `!vincular`) siendo el **Host** del directo.
*   **Pros:** Es interactivo y demuestra control real sobre el stream.
*   **Contras:** Requiere que el usuario esté en vivo en ese momento.

---

## 3. Implementación con API Oficial (OAuth)

Esta es la solución más profesional y robusta.

### Ventajas (Pros)
1.  **UserID Permanente:** Obtenemos un ID único que nunca cambia, permitiendo actualizar el `@username` automáticamente.
2.  **Confianza:** El botón "Login with TikTok" eleva el prestigio de la plataforma.
3.  **Seguridad:** Garantiza al 100% que el usuario es el dueño de la cuenta.

### Desafíos (Contras)
1.  **Revisión de TikTok:** Requiere pasar un proceso de auditoría por parte de TikTok.
2.  **Complejidad:** Manejo de Tokens (Access/Refresh) y Redirect URIs.

---

## 4. Plan de Acción Recomendado

1.  **Fase 1: Transparencia (UX)**
    *   Añadir etiquetas de **"Solo Lectura"** en el chat de TikTok para gestionar expectativas.
2.  **Fase 2: Integración de API Oficial**
    *   Crear la aplicación en TikTok for Developers.
    *   Implementar el flujo de OAuth para guardar el `userId` en la base de datos (`connections` table).
3.  **Fase 3: Híbrido**
    *   Usar el `userId` obtenido por la API oficial para resolver siempre el `@username` correcto para la librería de chat externa.

---

*Documento generado por Antigravity para el equipo de Streamlyra.*
