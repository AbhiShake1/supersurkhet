import type { ComponentRegistry } from '@/components/ui/ui-builder/types';
import { z } from 'zod';
import { MinimalTiptapEditor } from '@/components/ui/minimal-tiptap/minimal-tiptap';
import {
  classNameFieldOverrides,
  propAsTipTapFieldOverrides,
} from '@/lib/ui-builder/registry/form-field-overrides';

const MinimalTiptapSchema = z.object({
  className: z.string().optional(),
  editorContentClassName: z.string().optional(),
  editorClassName: z.string().optional(),
  throttleDelay: z.coerce.number().optional().default(0),
  value: z.string().optional(),
  output: z.enum(['html', 'json', 'text', 'markdown']).default('markdown'),
  placeholder: z.string().optional(),
  editable: z.boolean().default(true),
  immediatelyRender: z.boolean().default(false),
  autofocus: z.boolean().default(false),
});

export const minimalTiptapComponentDefinitions: ComponentRegistry = {
  MinimalTiptapEditor: {
    component: MinimalTiptapEditor,
    schema: MinimalTiptapSchema,
    from: '@/components/ui/minimal-tiptap/minimal-tiptap',
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer),
      editorClassName: (layer) => classNameFieldOverrides(layer),
      editorContentClassName: (layer) => classNameFieldOverrides(layer),
      value: (layer) => propAsTipTapFieldOverrides(layer, { propName: 'value' }),
    },
    defaultChildren: [],
  },
};
