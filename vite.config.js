import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => {
  return {
    plugins: [react()],
    base: command === 'build' ? '/satis-crm/' : '/',
    build: {
      outDir: 'dist',
    },
    server: {
      port: 5173,
      host: true
    }
  }
})
