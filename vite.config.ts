import { defineConfig } from 'vite';
import path from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig(({ command }) => {
  const shared = {
    resolve: {
      alias: {
        'bonkjs': path.resolve(__dirname, 'src'),
      },
    },
  };

  if (command === 'serve') {
    return {
      ...shared,
      server: {
        port: 3000,
        strictPort: true,
      },
    };
  }

  // build — library mode
  return {
    ...shared,
    build: {
      lib: {
        entry: {
          bonkjs: path.resolve(__dirname, 'src/index.ts'),
          desktop: path.resolve(__dirname, 'src/desktop/index.ts'),
        },
        formats: ['es'],
        fileName: (_format, entryName) => `${entryName}.js`,
      },
      rollupOptions: {
        // electron is runtime-provided by the game's Electron install (desktop entry only)
        external: ['pixi.js', 'electron', /^node:/],
      },
      target: 'ES2022',
      sourcemap: true,
    },
    plugins: [
      dts({ tsconfigPath: './tsconfig.build.json' }),
    ],
  };
});
