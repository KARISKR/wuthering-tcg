import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    host: true, // 외부/다른 기기(동일 공유기·와이파이) 접속 허용 (0.0.0.0)
    proxy: {
      '/api/sldark': {
        target: 'https://mc.sldark.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/sldark/, '/api'),
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react';
            }
            if (id.includes('lucide-react') || id.includes('canvas-confetti')) {
              return 'vendor-ui';
            }
            return 'vendor-libs';
          }
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})
