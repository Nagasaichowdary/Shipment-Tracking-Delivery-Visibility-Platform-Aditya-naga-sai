import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      // Forward every request that starts with /api to Spring Boot.
      // This eliminates the need for any CORS configuration in dev and
      // ensures relative-URL fetch() calls reach the backend, not Vite's
      // SPA fallback (which would return index.html → parse error).
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})