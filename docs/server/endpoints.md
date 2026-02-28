# Endpoints de la API

La API de Streamlyra se encuentra agrupada bajo el prefijo `/api`. A continuación, se detallan los endpoints disponibles y su funcionalidad.

## Autenticación y Usuarios (`/api/auth`)

Gestiona el inicio de sesión, la vinculación de plataformas y el estado del usuario.

| Método   | Ruta                        | Descripción                                                  | Requiere Auth |
| :------- | :-------------------------- | :----------------------------------------------------------- | :------------ |
| `GET`    | `/me`                       | Obtiene el perfil del usuario actual y sus conexiones.       | Sí            |
| `POST`   | `/twitch`                   | Procesa el código de OAuth para vincular/loguear con Twitch. | Opcional      |
| `POST`   | `/youtube`                  | Procesa el código de OAuth para vincular YouTube.            | Sí            |
| `POST`   | `/kick`                     | Conecta una cuenta de Kick mediante el código temporal.      | Sí            |
| `POST`   | `/logout`                   | Cierra la sesión del usuario y limpia las cookies.           | Sí            |
| `DELETE` | `/platform`                 | Desvincula una plataforma específica del perfil.             | Sí            |
| `POST`   | `/overlay-token/regenerate` | Genera un nuevo token para el overlay de OBS.                | Sí            |

## Webhooks (`/api/webhooks`)

Endpoints destinados a recibir eventos en tiempo real directamente desde las plataformas externas.

| Método | Ruta       | Plataforma | Descripción                                                                  |
| :----- | :--------- | :--------- | :--------------------------------------------------------------------------- |
| `POST` | `/twitch`  | Twitch     | Recibe eventos de seguimientos, suscripciones y raids vía **EventSub**.      |
| `POST` | `/youtube` | YouTube    | Recibe notificaciones de nuevos videos o estados de live (vía PubSubHubbub). |

## Estado del Sistema

| Método | Ruta      | Descripción                                                 |
| :----- | :-------- | :---------------------------------------------------------- |
| `GET`  | `/status` | Devuelve un JSON con el estado actual de la API (`online`). |
| `GET`  | `/`       | Comprobación básica de funcionamiento del servidor.         |

## Seguridad

- **CSRF Protection**: Todas las peticiones mutables (`POST`, `PUT`, `DELETE`) requieren un token CSRF válido enviado en los headers.
- **Rate Limiting**: Los endpoints de autenticación y webhooks tienen límites de peticiones para prevenir abusos.
- **Validación**: Utilizamos **Zod** para validar estrictamente el cuerpo de las peticiones antes de procesarlas.

---

ElSantana
