import { getLabel, type ParsedField } from '@autoform/core';
import type React from 'react';
import { useFieldArray, useFormContext } from 'react-hook-form';
import { AutoFormField } from './AutoFormField';
import { useAutoForm } from './context';
import { formatTestId } from './utils';

export const ArrayField: React.FC<{
  field: ParsedField;
  path: string[];
}> = ({ field, path }) => {
  const { uiComponents } = useAutoForm();
  const { control } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: path.join('.'),
  });
  const testIdBase = formatTestId(path);

  const subFieldType = field.schema?.[0]?.type;
  // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  let defaultValue: any;
  if (subFieldType === 'object') {
    defaultValue = {};
  } else if (subFieldType === 'array') {
    defaultValue = [];
  } else {
    defaultValue = null;
  }

  return (
    <uiComponents.ArrayWrapper
      label={getLabel(field)}
      field={field}
      onAddItem={() => append(defaultValue)}
      testId={testIdBase}
      addTestId={`af-add-${testIdBase}`}
    >
      {fields.map((item, index) => (
        <uiComponents.ArrayElementWrapper
          key={item.id}
          onRemove={() => remove(index)}
          index={index}
          testId={`af-item-${testIdBase}-${index}`}
          removeTestId={`af-remove-${testIdBase}-${index}`}
        >
          <AutoFormField
            // biome-ignore lint/style/noNonNullAssertion: lint debt cleanup
            field={field.schema?.[0]!}
            path={[...path, index.toString()]}
          />
        </uiComponents.ArrayElementWrapper>
      ))}
    </uiComponents.ArrayWrapper>
  );
};
