import { buildZodFieldConfig } from "@autoform/react";
import type { FieldTypes } from "./AutoForm";
import type { PossibleTabConfig } from "@/components/auto-admin";

type FieldConfigCustomData = {
  tabs?: PossibleTabConfig[];
  slug?: string;
  options?: [string, string][];
}

export const fieldConfig = buildZodFieldConfig<
  FieldTypes,
  FieldConfigCustomData
>();
