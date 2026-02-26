import { Plus, Trash } from 'lucide-react';
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
import type { FieldConfig } from '../types';
import { beautifyObjectName, getBaseType } from '../utils';
import AutoFormInput from './input';
import AutoFormObject from './object';

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
function getRecordSchema(item: z.ZodRecord<any, any>) {
  const keyType = item._def.keyType;
  if (keyType) return [keyType, item._def.valueType] as const;
  if ('innerType' in item._def)
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    return getRecordSchema(item._def.innerType as z.ZodRecord<any, any>);
  return [z.string(), z.string()] as const;
}

export default function AutoFormRecord({
  name,
  item,
  form,
  path = [],
  fieldConfig,
}: {
  name: string;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  item: z.ZodRecord<any, any>;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  form: any;
  path?: string[];
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  fieldConfig?: FieldConfig<any>;
}) {
  const title = item._def.description ?? beautifyObjectName(name);

  const [_keySchema, valueSchema] = getRecordSchema(item);

  const valueBaseType = getBaseType(valueSchema);

  // Real record stored as: { [key: string]: value }
  const record = useWatch({ control: form.control, name }) ?? {};

  const setValue = form.setValue;

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
          const keyPath = `${name}.${internalKey}.__key`;
          const valuePath = `${name}.${internalKey}`;

          return (
            <div
              key={internalKey}
              className="flex flex-col gap-4 border border-muted p-4 rounded-lg"
            >
              {/* KEY INPUT */}
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <FormField
                    control={form.control}
                    name={keyPath}
                    defaultValue={internalKey}
                    render={({ field }) => (
                      <AutoFormInput
                        label="Key"
                        isRequired
                        field={field}
                        fieldConfigItem={fieldConfig?.key}
                        fieldProps={{
                          value: field.value ?? internalKey,
                          // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
                          onChange: (e: any) =>
                            updateKey(internalKey, e.target.value),
                        }}
                      />
                    )}
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
                    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
                    schema={valueSchema as z.ZodObject<any, any>}
                    form={form}
                    fieldConfig={fieldConfig}
                    path={[...path, internalKey]}
                  />
                ) : (
                  <FormField
                    control={form.control}
                    name={valuePath}
                    render={({ field }) => {
                      field = {
                        ...field,
                        value: record[field.value.__key],
                      };
                      return (
                        <AutoFormInput
                          label="Value"
                          isRequired
                          field={field}
                          fieldConfigItem={fieldConfig?.value}
                          fieldProps={field}
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
