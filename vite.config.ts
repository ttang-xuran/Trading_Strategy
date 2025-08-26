import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
      // CORS Proxy for external Bitcoin APIs
      '/proxy/coingecko': {
        target: 'https://api.coingecko.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy\/coingecko/, ''),
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; BTC-Strategy/1.0)',
        },
      },
      '/proxy/binance': {
        target: 'https://api.binance.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy\/binance/, ''),
      },
      '/proxy/coinbase': {
        target: 'https://api.coinbase.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy\/coinbase/, ''),
      },
      '/proxy/bitstamp': {
        target: 'https://www.bitstamp.net',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/proxy\/bitstamp/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          plotly: ['react-plotly.js', 'plotly.js']
        }
      }
    }
  },
  define: {
    'process.env': {},
  },
})