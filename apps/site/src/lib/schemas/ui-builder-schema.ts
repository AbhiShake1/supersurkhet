import { z } from "zod";
import type { ComponentLayer, Variable } from "@/components/ui/ui-builder/types";
import { zStringified } from "./helpers";
import { table } from "./listings";

export const uiBuilderLayerSchema: z.ZodType<ComponentLayer> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string().optional(),
    type: z.string(),
    props: z.record(z.string(), z.any()),
    children: z.union([
      z.string(),
      z.array(uiBuilderLayerSchema),
    ])
  })
);

export const uiBuilderVariableSchema: z.ZodType<Variable> = z.discriminatedUnion(
  "type",
  [
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.literal("string"),
      defaultValue: z.string(),
    }),
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.literal("number"),
      defaultValue: z.number(),
    }),
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.literal("boolean"),
      defaultValue: z.boolean(),
    }),
  ]
);

export const uiBuilderSchema = z.object({
  variables: zStringified(uiBuilderVariableSchema.array()).optional(),
  layers: zStringified(uiBuilderLayerSchema.array()).optional(),
}).extend(table)
