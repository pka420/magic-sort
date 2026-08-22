/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // The game is served from a path, never from the root of a domain: GitHub
  // Pages publishes it under the repository name. Asset URLs have to carry that
  // prefix or the browser looks for them at the domain root and finds nothing.
  base: '/magic-sort/',
  plugins: [react()],
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
