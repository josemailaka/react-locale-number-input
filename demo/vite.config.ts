import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [react()],
  css: {
    preprocessorOptions: {
      scss: { silenceDeprecations: ['import', 'global-builtin', 'color-functions'] },
    },
  },
  server: { open: true },
});
