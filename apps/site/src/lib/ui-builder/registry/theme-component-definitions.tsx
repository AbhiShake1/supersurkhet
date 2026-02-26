import z from 'zod';
import { ThemeEditor } from '@/components/theme/theme-editor';
import { ThemePresetSelector } from '@/components/theme/theme-preset-selector';

import { ThemeToggle } from '@/components/theme/theme-toggle';
import { ButtonSchema } from '@/components/ui/button';
import type { ComponentRegistry } from '@/components/ui/ui-builder/types';
import { DivSchema } from './div-component-definitions';
import { commonFieldOverrides } from './form-field-overrides';

export const themeComponentDefinitions: ComponentRegistry = {
  ThemeToggle: {
    component: ThemeToggle,
    schema: ButtonSchema,
    from: '@/components/theme/theme-toggle',
    fieldOverrides: commonFieldOverrides(),
  },
  ThemePresetSelector: {
    component: ThemePresetSelector,
    schema: DivSchema,
    from: '@/components/theme/theme-preset-selector',
    fieldOverrides: commonFieldOverrides(),
  },
  ThemeEditor: {
    component: ThemeEditor,
    schema: z.object({
      className: z.string().optional(),
      compact: z.boolean().optional(),
    }),
    from: '@/components/theme/theme-editor',
    fieldOverrides: commonFieldOverrides(),
  },
};
