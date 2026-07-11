import { defineConfig } from 'vite';
import path from 'path';

// Renderer build for the desktop shell. base './' so the bundle loads over file://
// inside the packaged app (absolute /assets paths would 404 there).
export default defineConfig({
  base: './',
  resolve: {
    alias: {
      bonkjs: path.resolve(__dirname, '../src'),
    },
    // bonkjs source (../src) resolves pixi from the ROOT node_modules while the
    // demo resolves it from desktop/node_modules — two pixi copies split the
    // extension registry and Application.init() hangs forever. Force one copy.
    dedupe: ['pixi.js'],
  },
  build: {
    outDir: 'dist-web',
    target: 'ES2022',
  },
  server: {
    port: 5199,
    strictPort: true,
  },
});
