import { defineConfig } from 'tsup';

export default defineConfig({
  entry: { index: 'src/index.ts' },
  format: ['esm', 'cjs'],
  // Generates dist/index.d.ts (ESM) and dist/index.d.cts (CommonJS).
  dts: { compilerOptions: { types: [] } },
  sourcemap: true,
  clean: false,
  target: 'es2020',
  platform: 'browser',
  external: ['react', 'react-dom', 'react/jsx-runtime'],
  // The component uses state, so it must be a client component in
  // React Server Components frameworks (Next.js App Router, etc.).
  banner: { js: '"use client";' },
});
