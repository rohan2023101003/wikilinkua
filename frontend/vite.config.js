import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: '../wikilinkua/static/dist',
    emptyOutDir: true
  },
  base: '/static/dist/'
})
