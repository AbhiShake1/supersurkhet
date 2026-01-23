import { buildZodFieldConfig } from "./react";
import type { FieldTypes } from "./AutoForm";
import type { PossibleTabConfig } from "@/components/auto-admin";
import type { UseFormReturn } from "react-hook-form";
import type { NestedSchemaType, SchemaKeys } from "@/lib/gun/index";

export type SourceConfig = {
  [K in SchemaKeys]: {
    table: K;
  } & ({
    displayKey: keyof NestedSchemaType<K>
  } | {
    displayKey?: never
    displayKeys: Array<keyof NestedSchemaType<K>>
    separator: string
    suffix?: string
  })
}[SchemaKeys]

export type FieldConfigCustomData = {
  tabs?: PossibleTabConfig[];
  slug?: string;
} & ({
  onValueChange?: (value: string, path: string[], form: UseFormReturn) => void;
}) & ({
  options?: [string, string][] | (readonly [string, string])[];
  source?: never
} | {
  sources?: Array<SourceConfig>
  options?: never
}) & ({
  onlyAllow?: string[]
  configDisabled?: boolean
})

export const fieldConfig = buildZodFieldConfig<
  FieldTypes,
  FieldConfigCustomData
>();
