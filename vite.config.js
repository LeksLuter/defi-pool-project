import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: 'frontend', // Указываем корневую директорию фронтенда
  server: {
    port: 3000,
    strictPort: true, // StackBlitz может требовать точного порта
    host: true,       // Для доступности сервера dev в StackBlitz
  },
  build: {
    outDir: '../dist', // Сборка будет в корневой папке dist
    emptyOutDir: true, // Очищать папку сборки перед каждой сборкой
  },
  // Указываем алиасы для путей, если это необходимо (опционально)
  resolve: {
    alias: {
      '@': '/src', // Алиас для папки src
    },
  },
});