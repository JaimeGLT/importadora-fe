import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

const BACKEND = 'http://usaautopartesapi20260406085513-amh4fwdnanbpa9gs.centralus-01.azurewebsites.net'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: BACKEND,
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: { '*': '' },
      },
      '/graphql': {
        target: BACKEND,
        changeOrigin: true,
        secure: true,
        cookieDomainRewrite: { '*': '' },
      },
    },
  },
})
