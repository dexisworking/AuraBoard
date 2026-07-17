import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/main',
      lib: {
        entry: path.resolve(__dirname, 'electron/main.js'),
        formats: ['cjs'],
      },
      rollupOptions: {
        external: ['electron', 'electron-store', 'path', 'fs', 'url', 'node:path', 'node:fs', 'node:url', 'node:module', 'node:http', 'node:crypto', 'rss-parser', 'yahoo-finance2'],
      },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'out/preload',
      lib: {
        entry: path.resolve(__dirname, 'electron/preload.js'),
        formats: ['cjs'],
      },
      rollupOptions: {
        external: ['electron'],
      },
    },
  },
  renderer: {
    root: '.',
    plugins: [react()],
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: {
          screensaver: path.resolve(__dirname, 'index.html'),
          settings: path.resolve(__dirname, 'settings.html'),
          layout: path.resolve(__dirname, 'layout.html'),
        },
      },
    },
  },
});
