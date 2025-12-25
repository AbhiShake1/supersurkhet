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
      {
        name: 'strip-use-client',
        enforce: 'pre',
        transform(code, id) {
          if (!id.includes('node_modules')) return

          // remove any top-level "use client" directive
          // even if comments or other directives exist before it
          const stripped = code.replace(
            /^[\s\S]*?(['"])use client\1;?\s*/m,
            (match) => match.replace(/(['"])use client\1;?\s*/, '')
          )

          if (stripped !== code) {
            return {
              code: stripped,
              map: null,
            }
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
