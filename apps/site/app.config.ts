import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from '@tanstack/react-start/config'
import { cloudflare } from 'unenv'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import react from "@vitejs/plugin-react"

export default defineConfig({
  tsr: {
    appDirectory: 'src',
  },
  vite: {
    plugins: [
      react({
        babel: {
          plugins: [
            ["babel-plugin-react-compiler", {}]
          ]
        }
      }),
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tailwindcss(),
    ],
  },
  server: {
    preset: 'cloudflare-pages',
    unenv: cloudflare,
  },
})
