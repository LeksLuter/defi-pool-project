import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // Для работы в контейнерах/StackBlitz
    strictPort: true
  },
  build: {
    outDir: 'dist', // Сборка будет в frontend/dist
    emptyOutDir: true
  }
})