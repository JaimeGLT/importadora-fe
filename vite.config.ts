import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const BACKEND = env.VITE_BACKEND_PROXY
  return {
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
        '/hubs': {
          target: BACKEND,
          changeOrigin: true,
          secure: true,
          ws: true,
          cookieDomainRewrite: { '*': '' },
        },
      },
    },
  }
})