import { defineConfig } from '@tanstack/start/config'
import { cloudflare } from 'unenv'
import viteTsConfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  vite: {
    plugins: [
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
    ],
  },
  server: {
    preset: 'cloudflare-pages',
    unenv: cloudflare,
  },
})
