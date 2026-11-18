import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  // GitHub Pages serves the demo under /<repository>/ (set by the pages workflow)
  base: process.env.DEMO_BASE || '/',
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: { silenceDeprecations: ['import', 'global-builtin', 'color-functions'] },
    },
  },
  server: { open: true },
});
