import { z } from "zod";
import type { ComponentLayer } from "@/components/ui/ui-builder/types";
import { zStringified } from "./helpers";
import { table } from "./listings";

export const uiBuilderLayerSchema: z.ZodType<ComponentLayer> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    props: z.record(z.string(), z.any()),
    children: z.union([
      z.string(),
      z.array(uiBuilderLayerSchema),
    ])
  })
);

export const uiBuilderSchema = z.object({
  layers: zStringified(uiBuilderLayerSchema.array()).optional(),
}).extend(table)

export type UiBuilderSchema = z.infer<typeof uiBuilderSchema>;
export type UiBuilderLayer = z.infer<typeof uiBuilderLayerSchema>;
