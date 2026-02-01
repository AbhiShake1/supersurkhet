import { type Plugin } from 'vite';
import { generate } from './emit.js';

export interface ZodTypegenOptions {
  entry: string;
  output: string;
}

export default function zodTypegen(options: ZodTypegenOptions): Plugin {
  return {
    name: 'vite-plugin-zod-typegen',
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
