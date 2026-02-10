import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'vendor-router';
            if (id.includes('socket.io-client')) return 'vendor-socket';
            if (id.includes('emoji-picker-react')) return 'vendor-emoji';
            if (id.includes('react-icons')) return 'vendor-icons';
            if (id.includes('react-virtuoso') || id.includes('react-window') || id.includes('react-virtualized-auto-sizer')) return 'vendor-virt';
            if (id.includes('react') || id.includes('scheduler')) return 'vendor-react';
            return 'vendor-others';
          }
        }
      }
    }
  }
})
