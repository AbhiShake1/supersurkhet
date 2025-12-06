import {
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Plus, Trash } from "lucide-react";
import { useFieldArray, useForm } from "react-hook-form";
import * as z from "zod";

import { beautifyObjectName, getBaseType } from "../utils";
import AutoFormObject from "./object";
import AutoFormInput from "./input";
import type { FieldConfig } from "../types";
import { FormField } from "../../form";

export default function AutoFormRecord({
  name,
  item,
  form,
  path = [],
  fieldConfig,
}: {
  name: string;
  item: z.ZodRecord<any, any>;
  form: ReturnType<typeof useForm>;
  path?: string[];
  fieldConfig?: FieldConfig<any>;
}) {
  const title = item._def.description ?? beautifyObjectName(name);

  const keySchema = item._def.keyType;
  const valueSchema = item._def.valueType;

  const valueBaseType = getBaseType(valueSchema);

  // Record stored as: [{ key: "...", value: "..." }]
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name,
  });

  return (
    <AccordionItem value={name} className="border-none">
      <AccordionTrigger>{title}</AccordionTrigger>

      <AccordionContent className="space-y-4">
        {fields.map((field, index) => {
          const entryKey = `${field.id}`;
          const fullKeyPath = `${name}.${index}.key`;
          const fullValuePath = `${name}.${index}.value`;

          return (
            <div
              key={entryKey}
              className="flex flex-col gap-4 border border-muted p-4 rounded-lg"
            >
              {/* KEY INPUT */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name={fullKeyPath}
                    render={({ field }) => (
                      <AutoFormInput
                        label="Key"
                        isRequired={true}
                        field={field}
                        fieldConfigItem={fieldConfig?.key}
                        fieldProps={{
                          ...field,
                          name: fullKeyPath,
                        }}
                      />
                    )}
                  />
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => remove(index)}
                >
                  <Trash className="size-4" />
                </Button>
              </div>

              {/* VALUE INPUT */}
              <div>
                {valueBaseType === "ZodObject" ? (
                  <AutoFormObject
                    schema={valueSchema as z.ZodObject<any, any>}
                    form={form}
                    fieldConfig={fieldConfig}
                    path={[...path, index.toString(), "value"]}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name={fullValuePath}
                    render={({ field }) => (
                      <AutoFormInput
                        label="Value"
                        isRequired={false}
                        field={field}
                        fieldConfigItem={fieldConfig?.value}
                        fieldProps={{
                          ...field,
                          name: fullValuePath,
                        }}
                      />
                    )}
                  />
                )}
              </div>

              <Separator />
            </div>
          );
        })}

        <Button
          type="button"
          variant="secondary"
          onClick={() => append({ key: "", value: "" })}
          className="flex items-center"
        >
          <Plus className="mr-2" size={16} />
          Add Item
        </Button>
      </AccordionContent>
    </AccordionItem>
  );
}
