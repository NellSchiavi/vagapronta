import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// O app é publicado em https://nellschiavi.github.io/vagapronta/
// (o "vite preview" usa o mesmo caminho, para testar o build como ele fica publicado)
export default defineConfig(({ command, isPreview }) => ({
  base: command === 'build' || isPreview ? '/vagapronta/' : '/',
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  server: { port: 5173 },
  build: {
    rollupOptions: {
      output: {
        // bibliotecas em arquivos próprios: mudam pouco e ficam no cache do navegador entre versões do app
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) return 'react'
          if (id.includes('node_modules/@supabase/')) return 'supabase'
          if (id.includes('node_modules/@tanstack/')) return 'query'
          if (/node_modules\/(@radix-ui|tailwind-merge|class-variance-authority|sonner|lucide-react)\//.test(id)) return 'ui'
          if (/node_modules\/(framer-motion|motion-dom|motion-utils)\//.test(id)) return 'motion'
          if (/node_modules\/(react-hook-form|@hookform|zod)\//.test(id)) return 'forms'
          return undefined
        },
      },
    },
  },
}))
