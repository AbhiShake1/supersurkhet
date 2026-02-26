import type * as z from 'zod';
import { Combobox } from '@/components/ui/combobox';
import { FormControl, FormItem, FormMessage } from '@/components/ui/form';
import AutoFormLabel from '../common/label';
import AutoFormTooltip from '../common/tooltip';
import type { AutoFormInputComponentProps } from '../types';
import { getBaseSchema } from '../utils';

export default function AutoFormEnum({
  label,
  isRequired,
  field,
  fieldConfigItem,
  zodItem,
  fieldProps,
}: AutoFormInputComponentProps) {
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  const baseValues = (getBaseSchema(zodItem) as unknown as z.ZodEnum<any>)._def
    .values;

  let values: [string, string][] = [];
  if (!Array.isArray(baseValues)) {
    values = Object.entries(baseValues);
  } else {
    values = baseValues.map((value) => [value, value]);
  }

  // Convert to the format expected by Combobox
  const options = values.map(([value, label]) => ({
    value: value.toString(),
    label: label.toString(),
  }));

  return (
    <FormItem>
      <AutoFormLabel
        label={fieldConfigItem?.label || label}
        isRequired={isRequired}
      />
      <FormControl>
        <Combobox
          options={options}
          value={field.value?.toString()}
          onValueChange={field.onChange}
          placeholder={
            fieldConfigItem.inputProps?.placeholder || 'Select an option...'
          }
          className={fieldProps.className}
          disabled={fieldProps.disabled}
        />
      </FormControl>
      <AutoFormTooltip fieldConfigItem={fieldConfigItem} />
      <FormMessage />
    </FormItem>
  );
}
