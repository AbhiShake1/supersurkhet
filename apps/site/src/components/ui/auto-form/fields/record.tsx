import { Plus, Trash } from 'lucide-react';
import type {
  ControllerRenderProps,
  FieldValues,
  UseFormReturn,
} from 'react-hook-form';
import { useWatch } from 'react-hook-form';
import * as z from 'zod';
import {
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { FormField } from '../../form';
import type { FieldConfig, FieldConfigItem } from '../types';
import { beautifyObjectName, getBaseType, zodToHtmlInputProps } from '../utils';
import AutoFormInput from './input';
import AutoFormObject from './object';

function getRecordSchema(item: z.ZodRecord<z.ZodTypeAny, z.ZodTypeAny>) {
  const keyType = item._def.keyType as z.ZodTypeAny | undefined;
  if (keyType) return [keyType, item._def.valueType] as const;
  if ('innerType' in item._def) {
    const innerType = item._def.innerType as unknown;
    if (innerType instanceof z.ZodRecord) {
      return getRecordSchema(innerType);
    }
  }
  return [z.string(), z.string()] as const;
}

function isFieldConfigItem(
  value: FieldConfigItem | FieldConfig<Record<string, unknown>> | undefined,
): value is FieldConfigItem {
  if (!value || typeof value !== 'object') return false;
  return (
    'description' in value ||
    'inputProps' in value ||
    'label' in value ||
    'fieldType' in value ||
    'renderParent' in value ||
    'order' in value
  );
}

function toFieldConfigItem(
  value: FieldConfigItem | FieldConfig<Record<string, unknown>> | undefined,
): FieldConfigItem {
  return isFieldConfigItem(value) ? value : {};
}

function getStaticField(
  name: string,
  value: string,
): ControllerRenderProps<FieldValues, string> {
  return {
    name,
    value,
    onBlur: () => undefined,
    onChange: () => undefined,
    ref: () => undefined,
  };
}

export default function AutoFormRecord({
  name,
  item,
  form,
  path = [],
  fieldConfig,
}: {
  name: string;
  item: z.ZodRecord<z.ZodTypeAny, z.ZodTypeAny>;
  form: UseFormReturn<FieldValues, unknown, FieldValues>;
  path?: string[];
  fieldConfig?: FieldConfig<Record<string, unknown>>;
}) {
  const title = item._def.description ?? beautifyObjectName(name);

  const [keySchema, valueSchema] = getRecordSchema(item);

  const valueBaseType = getBaseType(valueSchema);

  // Real record stored as: { [key: string]: value }
  const record = useWatch({ control: form.control, name }) ?? {};

  const setValue = form.setValue;
  const keyFieldConfig = toFieldConfigItem(fieldConfig?.key);
  const valueFieldConfig = toFieldConfigItem(fieldConfig?.value);

  const remove = (key: string) => {
    const clone = { ...record };
    delete clone[key];
    setValue(name, clone);
  };

  const updateKey = (oldKey: string, newKey: string) => {
    if (!newKey) return;

    const clone = { ...record };

    // Prevent duplicate keys silently
    if (clone[newKey] !== undefined) return;

    const v = clone[oldKey];
    delete clone[oldKey];
    clone[newKey] = v;

    setValue(name, clone);
  };

  const addItem = () => {
    const clone = { ...record };
    clone[crypto.randomUUID()] = ''; // temporary internal key
    setValue(name, clone);
  };

  return (
    <AccordionItem value={name} className="border-none">
      <AccordionTrigger>{title}</AccordionTrigger>

      <AccordionContent className="space-y-4">
        {Object.entries(record).map(([internalKey]) => {
          const valuePath = `${name}.${internalKey}`;
          const keyField = getStaticField(
            `${name}.${internalKey}`,
            internalKey,
          );

          return (
            <div
              key={internalKey}
              className="flex flex-col gap-4 border border-muted p-4 rounded-lg"
            >
              {/* KEY INPUT */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <AutoFormInput
                    label="Key"
                    isRequired
                    field={keyField}
                    zodInputProps={zodToHtmlInputProps(keySchema)}
                    fieldConfigItem={keyFieldConfig}
                    zodItem={keySchema}
                    fieldProps={{
                      ...keyFieldConfig.inputProps,
                      value: internalKey,
                      onChange: (nextKey: string) =>
                        updateKey(internalKey, nextKey),
                    }}
                  />
                </div>

                <Button
                  type="button"
                  variant="secondary"
                  size="icon"
                  onClick={() => remove(internalKey)}
                >
                  <Trash className="size-4" />
                </Button>
              </div>

              {/* VALUE INPUT */}
              <div>
                {valueBaseType === 'ZodObject' ? (
                  <AutoFormObject
                    schema={valueSchema as z.AnyZodObject}
                    form={form}
                    fieldConfig={fieldConfig}
                    path={[...path, internalKey]}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name={valuePath}
                    render={({ field }) => {
                      const resolvedValue =
                        (record as Record<string, unknown>)[internalKey] ?? '';
                      const normalizedField = {
                        ...field,
                        value: resolvedValue,
                      };
                      return (
                        <AutoFormInput
                          label="Value"
                          isRequired
                          field={normalizedField}
                          zodInputProps={zodToHtmlInputProps(valueSchema)}
                          fieldConfigItem={valueFieldConfig}
                          zodItem={valueSchema}
                          fieldProps={normalizedField}
                        />
                      );
                    }}
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
          onClick={addItem}
          className="flex items-center"
        >
          <Plus className="mr-2" size={16} />
          Add Item
        </Button>
      </AccordionContent>
    </AccordionItem>
  );
}
