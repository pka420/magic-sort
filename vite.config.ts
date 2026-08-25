/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // The game is served from the root of its own domain by nginx, so assets
  // live at the root too: no prefix to carry.
  base: '/',
  plugins: [react()],
  server: {
    // The API is served under /api in production; in dev, forward that path to
    // the FastAPI backend running locally so the game never sees a cross-origin
    // request.
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    // Playwright drives the browser itself; Vitest owns everything below it.
    exclude: ['e2e/**', 'node_modules/**'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/test/**', 'src/main.tsx']
    }
  }
})
