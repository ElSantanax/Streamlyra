import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

// https://vitepress.dev/reference/site-config
export default withMermaid(defineConfig({
  title: "Streamlyra.dev",
  description: "Sitio de documentación de Streamlyra",
  lang: 'es-ES',
  head: [
    ['link', { rel: 'icon', href: '/icons/streamlyra.svg' }]
  ],
  markdown: {

  },
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    logo: '/icons/streamlyra.svg',
    outline: [2, 3], // Muestra niveles de encabezado h2 y h3
    outlineTitle: 'En esta página',

    docFooter: {
      prev: 'Página anterior',
      next: 'Próxima página'
    },

    nav: [
      { text: 'Guía', link: '/introduccion' },
      { text: 'Servidor', link: '/server/arquitectura' },
      { text: 'Cliente', link: '/client/arquitectura' }
    ],

    sidebar: [
      // ─────────────────────────────────────────────
      // SECCIÓN 1: Empezando
      // ─────────────────────────────────────────────
      {
        text: 'Empezando',
        items: [
          { text: 'Introducción', link: '/introduccion' },
          { text: 'Instalación y Setup Local', link: '/instalacion' },
          { text: 'Variables de Entorno', link: '/configuracion-variables' },
          { text: 'Guía de Contribución', link: '/contribucion' }
        ]
      },

      // ─────────────────────────────────────────────
      // SECCIÓN 2: El Cliente (Frontend) - MOVIDO AQUÍ
      // ─────────────────────────────────────────────
      {
        text: 'El Cliente (Frontend)',
        items: [
          { text: 'Análisis Profundo (Frontend)', link: '/client/analisis-profundo' },
          { text: 'Arquitectura del Cliente', link: '/client/arquitectura' },
          { text: 'Gestión de Estado y Contexto', link: '/client/estado-contexto' },
          { text: 'Páginas y Rutas', link: '/client/paginas-rutas' },
          { text: 'Catálogo de Componentes', link: '/client/componentes' },
          { text: 'Comunicación con Servidor', link: '/client/servicios-api' },
          { text: 'Estrategias de Testing', link: '/client/testing' },
          { text: 'Tipos TypeScript del Cliente', link: '/client/tipos-typescript' },
          { text: 'Diccionario de Archivos', link: '/client/diccionario-archivos' }
        ]
      },

      // ─────────────────────────────────────────────
      // SECCIÓN 3: Infraestructura Base
      // ─────────────────────────────────────────────
      {
        text: 'Infraestructura del Servidor',
        items: [
          { text: 'Arquitectura del Servidor', link: '/server/arquitectura' },
          { text: 'Contenedor de Dependencias', link: '/server/contenedor-dependencias' },
          { text: 'Configuración Interna', link: '/server/configuracion' },
          { text: 'Base de Datos y Modelos', link: '/server/base-de-datos' },
          { text: 'Seguridad', link: '/server/seguridad' }
        ]
      },

      // ─────────────────────────────────────────────
      // SECCIÓN 4: Autenticación y Sesiones
      // ─────────────────────────────────────────────
      {
        text: 'Autenticación',
        items: [
          { text: 'Sistema OAuth y Flujos', link: '/server/autenticacion' },
          { text: 'Gestión de Tokens', link: '/server/gestion-tokens' }
        ]
      },

      // ─────────────────────────────────────────────
      // SECCIÓN 5: Capas de Código (exterior → interior)
      // ─────────────────────────────────────────────
      {
        text: 'Capas del Servidor',
        items: [
          { text: 'Endpoints de la API', link: '/server/endpoints' },
          { text: 'Middlewares (Guardianes)', link: '/server/middlewares' },
          { text: 'Controladores', link: '/server/controladores' },
          { text: 'Servicios Secundarios', link: '/server/servicios-secundarios' },
          { text: 'Webhooks: Procesamiento', link: '/server/webhooks-procesamiento' },
          { text: 'Persistencia (Repositorios)', link: '/server/persistencia' },
          { text: 'Utilidades Críticas', link: '/server/utilidades' }
        ]
      },

      // ─────────────────────────────────────────────
      // SECCIÓN 6: Integración de Plataformas
      // ─────────────────────────────────────────────
      {
        text: 'Integración de Plataformas',
        items: [
          { text: 'Conceptos Generales', link: '/server/plataformas' },
          { text: 'Clientes y Factories', link: '/server/clientes-plataformas' },
          { text: 'Twitch', link: '/server/plataformas/twitch' },
          { text: 'YouTube', link: '/server/plataformas/youtube' },
          { text: 'Kick y TikTok', link: '/server/plataformas/kick-tiktok' }
        ]
      },

      // ─────────────────────────────────────────────
      // SECCIÓN 7: Comunicación en Tiempo Real
      // ─────────────────────────────────────────────
      {
        text: 'Tiempo Real (Sockets)',
        items: [
          { text: 'WebSockets: Configuración', link: '/server/sockets' },
          { text: 'Sockets: Handlers y Eventos', link: '/server/sockets-detalle' },
          { text: 'Catálogo de Eventos Socket', link: '/server/eventos-socket' }
        ]
      },

      // ─────────────────────────────────────────────
      // SECCIÓN 8: Referencia y Calidad
      // ─────────────────────────────────────────────
      {
        text: 'Referencia y Calidad',
        items: [
          { text: 'Transformadores de Mensajes', link: '/server/transformadores' },
          { text: 'Tipos TypeScript', link: '/server/tipos-typescript' },
          { text: 'Análisis Profundo (src)', link: '/server/analisis-profundo' },
          { text: 'Diccionario de Archivos', link: '/server/diccionario-archivos' },
          { text: 'Testing', link: '/server/testing' },
          { text: 'Errores y Logging', link: '/server/errores-logs' },
          { text: 'Referencias de APIs', link: '/referencias' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ElSantanax/Streamlyra' }
    ],

    lastUpdated: {
      text: 'Actualizado el',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'medium'
      }
    },

    returnToTopLabel: 'Volver arriba',
    sidebarMenuLabel: 'Menú',
    darkModeSwitchLabel: 'Apariencia',
    lightModeSwitchTitle: 'Cambiar a modo claro',
    darkModeSwitchTitle: 'Cambiar a modo oscuro'
  }
}))
