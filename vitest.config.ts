/**
 * Standalone Vitest config (deliberately does NOT import vite.config.ts, so
 * the dev-server proxy / build options can never leak into or conflict with
 * the test runner). Mirrors the app's `@/` -> `src/` alias.
 */
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true,
    css: false,
    // Real timers + real framer-motion transitions: generous per-test budget
    // so slower CI machines never flake on animation settling.
    testTimeout: 20000,
    include: ['src/**/__tests__/**/*.test.{ts,tsx}'],
  },
});
