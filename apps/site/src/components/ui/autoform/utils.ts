import { buildZodFieldConfig } from "@autoform/react";
import type { FieldTypes } from "./AutoForm";
import type { PossibleTabConfig } from "@/components/auto-admin";
import type { UseFormReturn } from "react-hook-form";

type FieldConfigCustomData = {
  tabs?: PossibleTabConfig[];
  slug?: string;
} & ({
  options?: [string, string][];
  onValueChange?: (value: string, path: string[], form: UseFormReturn) => void;
}) & ({
  onlyAllow?: string[]
  configDisabled?: boolean
})

export const fieldConfig = buildZodFieldConfig<
  FieldTypes,
  FieldConfigCustomData
>();
