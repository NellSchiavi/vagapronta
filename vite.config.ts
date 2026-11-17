import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// O app é publicado em https://nellschiavi.github.io/vagapronta/
export default defineConfig(({ command }) => ({
  base: command === 'build' ? '/vagapronta/' : '/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173 },
}))
