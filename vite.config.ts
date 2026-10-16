import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// base './' supaya aset bisa dimuat dari file lokal di dalam APK (Capacitor)
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    target: 'es2020',
    chunkSizeWarningLimit: 1500,
  },
});
