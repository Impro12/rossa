import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  publicDir: 'public',
  base: '/',

  build: {
    target: 'es2020',
    outDir: 'dist',
    assetsInlineLimit: 0,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          gsap: ['gsap'],
        },
      },
    },
    chunkSizeWarningLimit: 250,
  },

  server: {
    port: 3000,
    open: true,
  },

  assetsInclude: ['**/*.glb', '**/*.ktx2', '**/*.hdr'],
});
