import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Streamlyra.dev",
  description: "Sitio de documentación de Streamlyra",
  lang: 'es-ES',
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    outline: [2, 3], // Muestra niveles de encabezado h2 y h3
    outlineTitle: 'En esta página',

    docFooter: {
      prev: 'Página anterior',
      next: 'Próxima página'
    },

    nav: [],

    sidebar: [
      {
        text: 'Documentación',
        items: [
          { text: 'Introduccion', link: '/introduccion' },
          { text: 'Configuracion de Variables', link: '/configuracion-variables' },
          { text: 'Guia de Contribucion', link: '/contribucion' },
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
})
