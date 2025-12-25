import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "@tanstack/react-start/config";
import { cloudflare } from "unenv";
import viteTsConfigPaths from "vite-tsconfig-paths";
// import basicSsl from "@vitejs/plugin-basic-ssl";
// import react from "@vitejs/plugin-react"

export default defineConfig({
  tsr: {
    appDirectory: "src",
  },
  react: {},
  vite: {
    build: {
      minify: "terser",
      sourcemap: false,
      terserOptions: {
        compress: true,
        mangle: true,
        sourceMap: false,
      },
      cssMinify: "lightningcss",
      dynamicImportVarsOptions: {
        warnOnError: false,
      },
      reportCompressedSize: false,
      // TODO: set to true when gun+tanstackquery preloading is complete
      ssr: false,
      rollupOptions: {
        onwarn(warning, defaultHandler) {
          if (
            warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
            warning.message.includes('use client')
          ) {
            return
          }

          defaultHandler(warning)
        },
      },
    },
    plugins: [
      // basicSsl(),
      viteTsConfigPaths({
        projects: ["./tsconfig.json"],
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
    preset: "cloudflare-pages",
    unenv: cloudflare,
  },
});
