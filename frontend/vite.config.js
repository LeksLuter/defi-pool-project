import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true, // Для работы в контейнерах/StackBlitz
    strictPort: true,
    // Отключение HMR для обхода проблемы CSP с 'eval'
    hmr: false,
    // Альтернативно, можно попробовать настроить HMR на другой порт (иногда помогает)
    // hmr: {
    //   port: 3001 // Или другой свободный порт
    // }
  },
  build: {
    outDir: 'dist', // Сборка будет в frontend/dist
    emptyOutDir: true
  },
  // Добавим базовый путь, если деплоим не в корень (обычно не нужно для Netlify)
  // base: '/', 
})