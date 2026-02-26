import type { FieldValues, UseFormReturn } from 'react-hook-form';
import { useFormContext } from 'react-hook-form';
import * as z from 'zod';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { FormField } from '@/components/ui/form';
import { DEFAULT_ZOD_HANDLERS, INPUT_COMPONENTS } from '../config';
import resolveDependencies from '../dependencies';
import type { Dependency, FieldConfig, FieldConfigItem } from '../types';
import {
  beautifyObjectName,
  getBaseSchema,
  getBaseType,
  sortFieldsByOrder,
  zodToHtmlInputProps,
} from '../utils';
import AutoFormArray from './array';
import AutoFormRecord from './record';

function DefaultParent({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

type ZodNumberDef = {
  typeName?: string;
  coerce?: boolean;
  innerType?: z.ZodTypeAny;
};

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

function asNestedFieldConfig(
  value: FieldConfigItem | FieldConfig<Record<string, unknown>> | undefined,
): FieldConfig<Record<string, unknown>> | undefined {
  if (!value || typeof value !== 'object') return undefined;
  if (isFieldConfigItem(value)) return undefined;
  return value;
}

export default function AutoFormObject<SchemaType extends z.AnyZodObject>({
  schema,
  form,
  fieldConfig,
  path = [],
  dependencies = [],
}: {
  schema: SchemaType | z.ZodEffects<SchemaType>;
  form: UseFormReturn<FieldValues, unknown, FieldValues>;
  fieldConfig?: FieldConfig<z.infer<SchemaType>>;
  path?: string[];
  dependencies?: Dependency<z.infer<SchemaType>>[];
}) {
  const { watch } = useFormContext(); // Use useFormContext to access the watch function

  if (!schema) {
    return null;
  }
  const { shape } = getBaseSchema<SchemaType>(schema) || {};

  if (!shape) {
    return null;
  }

  const handleIfZodNumber = (item: z.ZodAny) => {
    const itemDef = item._def as ZodNumberDef;
    const isZodNumber = itemDef.typeName === 'ZodNumber';
    const innerTypeDef = itemDef.innerType?._def as ZodNumberDef | undefined;
    const isInnerZodNumber = innerTypeDef?.typeName === 'ZodNumber';

    if (isZodNumber) {
      itemDef.coerce = true;
    } else if (isInnerZodNumber) {
      innerTypeDef.coerce = true;
    }

    return item;
  };

  const sortedFieldKeys = sortFieldsByOrder(fieldConfig, Object.keys(shape));

  return (
    <Accordion type="multiple" className="space-y-5 border-none">
      {sortedFieldKeys.map((name) => {
        let item = shape[name] as z.ZodAny;
        item = handleIfZodNumber(item) as z.ZodAny;
        const zodBaseType = getBaseType(item);
        const itemName = item._def.description ?? beautifyObjectName(name);
        const key = [...path, name].join('.');

        const {
          isHidden,
          isDisabled,
          isRequired: isRequiredByDependency,
          overrideOptions,
        } = resolveDependencies(dependencies, name, watch);
        if (isHidden) {
          return null;
        }

        if (zodBaseType === 'ZodObject') {
          const nestedFieldConfig = asNestedFieldConfig(fieldConfig?.[name]);
          return (
            <AccordionItem value={name} key={key} className="border-none">
              <AccordionTrigger>{itemName}</AccordionTrigger>
              <AccordionContent className="p-2">
                <AutoFormObject
                  schema={item as unknown as z.AnyZodObject}
                  form={form}
                  fieldConfig={nestedFieldConfig}
                  path={[...path, name]}
                />
              </AccordionContent>
            </AccordionItem>
          );
        }
        if (zodBaseType === 'ZodArray') {
          const nestedFieldConfig = asNestedFieldConfig(fieldConfig?.[name]);
          return (
            <AutoFormArray
              key={key}
              name={name}
              item={item as unknown as z.ZodArray<z.ZodTypeAny>}
              form={form}
              fieldConfig={nestedFieldConfig}
              path={[...path, name]}
            />
          );
        }
        if (zodBaseType === 'ZodRecord') {
          const nestedFieldConfig = asNestedFieldConfig(fieldConfig?.[name]);
          return (
            <AutoFormRecord
              key={key}
              name={name}
              item={item as unknown as z.ZodRecord<z.ZodTypeAny, z.ZodTypeAny>}
              form={form}
              fieldConfig={nestedFieldConfig}
              path={[...path, name]}
            />
          );
        }

        const fieldConfigValue = fieldConfig?.[name];
        const fieldConfigItem: FieldConfigItem = isFieldConfigItem(
          fieldConfigValue,
        )
          ? fieldConfigValue
          : {};
        const zodInputProps = zodToHtmlInputProps(item);
        const isRequired =
          isRequiredByDependency ||
          zodInputProps.required ||
          fieldConfigItem.inputProps?.required ||
          false;

        if (overrideOptions) {
          item = z.enum(overrideOptions) as unknown as z.ZodAny;
        }

        return (
          <FormField
            control={form.control}
            name={key}
            key={key}
            render={({ field }) => {
              const inputType =
                fieldConfigItem.fieldType ??
                DEFAULT_ZOD_HANDLERS[zodBaseType] ??
                'fallback';

              const InputComponent =
                typeof inputType === 'function'
                  ? inputType
                  : INPUT_COMPONENTS[inputType];

              const ParentElement =
                fieldConfigItem.renderParent ?? DefaultParent;

              const defaultValue = fieldConfigItem.inputProps?.defaultValue;
              const value = field.value ?? defaultValue ?? '';

              const fieldProps = {
                ...zodToHtmlInputProps(item),
                ...field,
                ...fieldConfigItem.inputProps,
                disabled: fieldConfigItem.inputProps?.disabled || isDisabled,
                ref: undefined,
                value: value,
              };

              if (InputComponent === undefined) {
                // biome-ignore lint/complexity/noUselessFragments: lint debt cleanup
                return <></>;
              }

              return (
                <ParentElement key={`${key}.parent`}>
                  <InputComponent
                    zodInputProps={zodInputProps}
                    field={field}
                    fieldConfigItem={fieldConfigItem}
                    label={itemName}
                    isRequired={isRequired}
                    zodItem={item}
                    fieldProps={fieldProps}
                    className={fieldProps.className}
                  />
                </ParentElement>
              );
            }}
          />
        );
      })}
    </Accordion>
  );
}
