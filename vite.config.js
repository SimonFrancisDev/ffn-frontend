import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('react-router')) return 'router'
          if (id.includes('ethers')) return 'web3'
          if (id.includes('react-bootstrap') || id.includes('lucide-react')) return 'ui'
          return 'vendor'
        },
      },
    },
  },
  server: {
    port: 3000,
    open: false,
    host: true,
    allowedHosts: [
      'localhost',
      '127.0.0.1',
      'lulu-nonexhaustible-brayden.ngrok-free.dev',
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false,
      },
    },
  }
})
