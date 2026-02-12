import type { PluginOption } from 'vite';
import { generate } from './emit.js';

export interface ZodTypegenOptions {
  entry: string;
  output: string;
}

export function zodTypegen(options: ZodTypegenOptions): PluginOption {
  return {
    name: 'vite-plugin-zod-typegen',
    enforce: 'pre',
    buildStart() {
      generate(options);
    },
    handleHotUpdate(ctx) {
      if (ctx.file.includes(options.entry)) {
        generate(options);
      }
    }
  };
}
