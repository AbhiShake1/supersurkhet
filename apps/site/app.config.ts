import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "@tanstack/react-start/config";
import { cloudflare } from "unenv";
import viteTsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  tsr: {
    appDirectory: "src",
  },
  react: {},
  vite: {
    resolve: {},
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
      // reportCompressedSize: false,
      // TODO: set to true when gun+tanstackquery preloading is complete
      // ssr: false,

      // rollupOptions: {
      //   onwarn(warning, defaultHandler) {
      //     if (
      //       warning.code === 'MODULE_LEVEL_DIRECTIVE' &&
      //       warning.message.includes('use client')
      //     ) {
      //       return
      //     }
      //
      //     defaultHandler(warning)
      //   },
      // },
    },
    plugins: [
      {
        name: 'strip-use-client-directive',
        // enforce: 'pre',
        transform(code) {
          if (code.startsWith("'use client'") || code.startsWith('"use client"')) {
            return { code: `            ${code.slice(12)}`, map: null };
          }
        },
      },
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
