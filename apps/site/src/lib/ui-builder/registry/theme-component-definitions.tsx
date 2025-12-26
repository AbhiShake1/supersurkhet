import type { ComponentLayer, ComponentRegistry } from "@/components/ui/ui-builder/types";
import z from "zod";
import { commonFieldOverrides } from "./form-field-overrides";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { ThemePresetSelector } from "@/components/theme/theme-preset-selector";
import { ThemeEditor } from "@/components/theme/theme-editor";
import { ButtonSchema } from "@/components/ui/button";
import { DivSchema } from "./div-component-definitions";

export const themeComponentDefinitions: ComponentRegistry = {
  ThemeToggle: {
    component: ThemeToggle,
    schema: ButtonSchema,
    from: '@/components/theme/theme-toggle',
    fieldOverrides: commonFieldOverrides()
  },
  ThemePresetSelector: {
    component: ThemePresetSelector,
    schema: DivSchema,
    from: '@/components/theme/theme-preset-selector',
    fieldOverrides: commonFieldOverrides()
  },
  ThemeEditor: {
    component: ThemeEditor,
    schema: z.object({
      className: z.string().optional(),
      compact: z.boolean().optional(),
    }),
    from: '@/components/theme/theme-editor',
    fieldOverrides: commonFieldOverrides()
  },
}
