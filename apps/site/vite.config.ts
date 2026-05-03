import { defineConfig } from 'vitest/config';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import viteReact from '@vitejs/plugin-react';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import { fileURLToPath, URL } from 'node:url';

import tailwindcss from '@tailwindcss/vite';
import { nitro } from 'nitro/vite';
import { zodTypegen } from './scripts/vite/zod-typegen';

const config = defineConfig({
  envDir: fileURLToPath(new URL('./src', import.meta.url)),
  test: {
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['tests/**'],
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [
    devtools(),
    nitro({
      compatibilityDate: '2024-09-19',
      preset: 'cloudflare-module',
      cloudflare: {
        nodeCompat: true,
        wrangler: {
          // main: fileURLToPath(new URL('./wrangler.toml', import.meta.url)),
          // durable_objects: {
          //   bindings: [
          //     {
          //       name: 'GUN_SOCKET',
          //       class_name: 'GunSocket',
          //     }
          //   ]
          // },
          compatibility_date: '2026-01-21',
          compatibility_flags: ['nodejs_compat'],
          keep_vars: true,
          observability: {
            enabled: true,
            logs: { enabled: true },
          },
        },
      },
      rollupConfig: {
        external: [
          'shiki',
          /^@shikijs\//,
          'mermaid',
          'maplibre-gl',
          'blockly',
          /^blockly\//,
          '@streamdown/code',
          '@streamdown/mermaid',
        ],
      },
    }),
    // this is the plugin that enables path aliases
    viteTsConfigPaths({
      projects: ['./tsconfig.json'],
    }),
    tailwindcss(),
    tanstackStart(),
    zodTypegen({
      entry: fileURLToPath(new URL('./src/lib/schema.ts', import.meta.url)),
      output: fileURLToPath(new URL('./src/types/db.d.ts', import.meta.url)),
    }),
    viteReact({
      babel: {
        plugins: [
          [
            'babel-plugin-react-compiler',
            {
              compilationMode: 'annotation',
            },
          ],
          ['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }],
        ],
      },
    }),
  ],
});

export default config;
