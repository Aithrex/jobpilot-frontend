import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: '/', // absolute paths required for SPA routing on sub-paths
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    // Safety net for local dev: any same-origin `/api/*` call is proxied to the
    // local backend so the app works even if VITE_API_URL is unset or relative.
    // api.ts uses an absolute VITE_API_URL by default, so this is a fallback.
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
}));
