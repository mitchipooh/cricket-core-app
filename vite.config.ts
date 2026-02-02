
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Ensures assets load correctly relative to the plugin folder
  build: {
    rollupOptions: {
      output: {
        // Disable hashing for easy WordPress enqueuing
        entryFileNames: `cricket-core.js`,
        chunkFileNames: `[name].js`,
        assetFileNames: `cricket-core.[ext]`
      }
    }
  }
})
