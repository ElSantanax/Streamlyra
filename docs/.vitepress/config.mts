import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "Streamlyra.dev",
  description: "Sitio de documentación de Streamlyra",
  themeConfig: {
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Inicio', link: '/' },
      { text: 'Ejemplos', link: '/markdown-examples' }
    ],

    sidebar: [
      {
        text: 'Ejemplos',
        items: [
          { text: 'Ejemplos de Markdown', link: '/markdown-examples' },
          { text: 'Ejemplos de API', link: '/api-examples' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/ElSantanax/Streamlyra' }
    ]
  }
})
