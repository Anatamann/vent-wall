import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Low-memory / Docker-friendly settings
    sourcemap: false,
    reportCompressedSize: false,
    minify: 'esbuild',
    target: 'es2020',
    chunkSizeWarningLimit: 2500,
    // Do NOT put three/react-globe in a shared manual chunk that the entry imports.
    // That forced ~2MB WebGL code on every page load and blank screens until it finished
    // (or OOM on weak devices). VentGlobe is already lazy-loaded via React.lazy().
    modulePreload: {
      polyfill: true,
      resolveDependencies: (_filename, deps) =>
        // Only preload lightweight react runtime for the entry; leave globe async.
        deps.filter((d) => d.includes('react-vendor') || !d.includes('globe') && !d.includes('three') && !d.includes('VentGlobe')),
    },
    rollupOptions: {
      maxParallelFileOps: 2,
      output: {
        manualChunks(id) {
          // Keep React shared only — never force three/globe into the entry graph
          if (
            id.includes('node_modules/react-dom') ||
            id.includes('node_modules/react-router') ||
            id.includes('node_modules/scheduler') ||
            // bare react package (not react-globe)
            id.includes('/node_modules/react/') ||
            id.endsWith('/node_modules/react/index.js')
          ) {
            return 'react-vendor'
          }
          return undefined
        },
      },
    },
  },
})
