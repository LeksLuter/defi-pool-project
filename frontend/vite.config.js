import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Указываем корневую директорию (по умолчанию это папка с этим файлом, т.е. frontend)
  // root: '.', // Можно не указывать, если vite.config.js в frontend
  build: {
    // По умолчанию outDir='../dist' относительно root (т.е. frontend/dist)
    // Это совпадает с тем, что ожидает netlify.toml
    outDir: 'dist',
    emptyOutDir: true // Очищать папку сборки перед каждой сборкой
  },
  server: {
    port: 3000,
    // Для работы внутри Docker/Netlify
    host: true,
    strictPort: true
  }
})