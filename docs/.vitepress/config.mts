import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Streamlyra.dev",
  description: "Sitio de documentación de Streamlyra",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [],

    sidebar: [
      {
        text: 'Documentación',
        items: [
          { text: 'Configuración del Entorno', link: '/configuracion-ejemplos' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ElSantanax/Streamlyra' }
    ]
  }
})
