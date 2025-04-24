import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from '@tanstack/react-start/config'
import { cloudflare } from 'unenv'
import viteTsConfigPaths from 'vite-tsconfig-paths'
// import react from "@vitejs/plugin-react"

export default defineConfig({
  tsr: {
    appDirectory: 'src',
  },
  vite: {
    plugins: [
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      // react({
      //   babel: {
      //     plugins: [
      //       ["babel-plugin-react-compiler", {}]
      //     ]
      //   }
      // }),
      tailwindcss(),
    ],
  },
  server: {
    preset: 'cloudflare-pages',
    unenv: cloudflare,
  },
})
