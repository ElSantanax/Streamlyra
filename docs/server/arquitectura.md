# Arquitectura del Servidor

Streamlyra utiliza una arquitectura modular basada en **Inyección de Dependencias (DI)** y el patrón **Controller-Service-Repository**. Esta estructura asegura que el código sea testeable, escalable y fácil de mantener.

## Estructura de Capas

El backend está organizado en las siguientes capas principales dentro de `server/src`:

### 1. Controladores (`/controllers`)

Son la puerta de entrada de las solicitudes HTTP. Su única responsabilidad es recibir la petición, validar los datos básicos y delegar la lógica de negocio a los servicios correspondientes.

- **Ejemplo**: `AuthController`, `WebhookController`.

### 2. Servicios (`/services`)

Es el corazón de la aplicación. Aquí reside toda la **lógica de negocio**. Los servicios interactúan con APIs externas (Twitch, YouTube, Kick) y coordinan las acciones complejas.

- **Contenedor de Dependencias**: Utilizamos un contenedor (`services/container.ts`) para instanciar y centralizar todos los servicios, facilitando su inyección en controladores y manejadores de sockets.

### 3. Repositorios (`/repositories`)

Se encargan exclusivamente del acceso a datos. Abstrayendo la base de datos (PostgreSQL vía Sequelize), permiten que los servicios no tengan que preocuparse por las consultas SQL directas.

- **Implementaciones**: Cada repositorio define una interfaz y una implementación concreta para facilitar el testing.

### 4. Modelos (`/models`)

Definiciones de las entidades de la base de datos utilizando **Sequelize**. Definen esquemas, relaciones y validaciones de datos a nivel de persistencia.

## Comunicación en Tiempo Real

Para la gestión de eventos en vivo, utilizamos **Socket.io**.

- **Handlers (`/socket`)**: Manejan eventos como nuevos mensajes de chat, alertas o cambios de estado, comunicándose directamente con los servicios para procesar la información en tiempo real.

## Flujo de una Solicitud

1. **Request**: El cliente envía una petición HTTP.
2. **Middleware**: Se verifican aspectos como CORS, CSRF, Rate Limiting y Autenticación.
3. **Controller**: Procesa la entrada y llama al **Service** inyectado.
4. **Service**: Ejecuta la lógica, interactúa con **Repositories** o APIs externas.
5. **Response**: El controlador devuelve la respuesta al cliente.

## Tecnologías Principales

- **Node.js & Express**: Framework base del servidor.
- **TypeScript**: Para tipado estático y mejor mantenibilidad.
- **Sequelize**: ORM para la gestión de PostgreSQL.
- **Socket.io**: Motor de comunicación bidireccional.
- **Pino**: Sistema de logging de alto rendimiento.
