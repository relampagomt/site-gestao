import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import nodePolyfills from 'rollup-plugin-node-polyfills'; // Importação corrigida

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Adicione aliases para módulos Node.js que podem ser usados pelo xlsx
      stream: 'rollup-plugin-node-polyfills/polyfills/stream',
      buffer: 'rollup-plugin-node-polyfills/polyfills/buffer',
      util: 'rollup-plugin-node-polyfills/polyfills/util',
      process: 'rollup-plugin-node-polyfills/polyfills/process-es6',
      fs: 'rollup-plugin-node-polyfills/polyfills/fs',
    },
  },
  build: {
    rollupOptions: {
      plugins: [
        nodePolyfills(), // Uso do plugin
      ],
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
} )
