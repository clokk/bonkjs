import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isEditor = mode === 'editor' || process.env.TAURI_ENV_PLATFORM !== undefined;

  return {
    plugins: [
      ...(isEditor ? [react()] : []),
    ],
    resolve: {
      alias: {
        '@engine': path.resolve(__dirname, 'src/engine'),
        '@behaviors': path.resolve(__dirname, 'behaviors'),
        '@editor': path.resolve(__dirname, 'src/editor'),
      },
    },
    build: {
      target: 'ES2022',
      sourcemap: true,
      rollupOptions: isEditor ? {
        input: {
          editor: path.resolve(__dirname, 'editor.html'),
        },
      } : undefined,
    },
    server: {
      port: isEditor ? 1420 : 3000,
      strictPort: true,
    },
    // Tauri expects a fixed port
    clearScreen: false,
  };
});
