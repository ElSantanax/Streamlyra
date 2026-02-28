# Referencias de APIs

Aquí encontrarás los enlaces directos a la documentación técnica oficial de cada plataforma para entender cómo funcionan sus integraciones.

## Documentación Oficial

| Plataforma  | Documentación Técnica                                                                  | Temas Clave                               |
| :---------- | :------------------------------------------------------------------------------------- | :---------------------------------------- |
| **Twitch**  | [Twitch API Docs](https://dev.twitch.tv/docs/api/)                                     | EventSub (Webhooks), OAuth 2.0, Helix API |
| **YouTube** | [YouTube Data API v3](https://developers.google.com/youtube/v3)                        | Live Streaming API, OAuth 2.0, Cuotas     |
| **Kick**    | [Kick API Docs](https://docs.kick.com/)                                                | Autenticación PKCE, Chat, Webhooks        |
| **TikTok**  | [TikTok Live Gift Explorer](https://github.com/zerodytrash/TikTok-Live-Connector) | Sin OAuth público — ver nota abajo        |

> **Nota sobre TikTok**: TikTok no ofrece una API pública oficial para el chat en vivo. Streamlyra utiliza un cliente de la comunidad (basado en `tiktok-live-connector`) que se conecta directamente al stream mediante el `username` del streamer. No requiere gestión de tokens, solo el nombre de usuario configurado en el dashboard.

---

## Herramientas de Pruebas

Para probar las APIs antes de integrarlas en el código:

- **[Twitch CLI](https://dev.twitch.tv/docs/cli/)**: Herramienta oficial para simular webhooks de EventSub localmente sin necesitar un servidor público.
- **[Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground/)**: Para probar y obtener tokens de YouTube manualmente y verificar scopes.
- **[Kick API Console](https://docs.kick.com/)**: Sección de pruebas integrada en la documentación oficial de Kick.
- **Postman**: Para hacer peticiones manuales a cualquier endpoint REST de las plataformas.

---

## Configuración de Credenciales

Consulta la página de [Variables de Entorno](/configuracion-variables) para saber exactamente qué claves necesitas de cada plataforma y cómo configurarlas en el archivo `.env`.

---

ElSantana
