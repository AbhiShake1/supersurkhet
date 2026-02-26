import { useQuery } from '@tanstack/react-query';
import type React from 'react';
import { useFormContext } from 'react-hook-form';
import { useBusinessSafe } from '@/contexts/business-context';
import type { UseGet } from '@/lib/gun/index';
import { Combobox } from '../../combobox';
import { useAutoFormDefaultValues } from '../AutoForm';
import { runFieldOnValueChange } from '../on-value-change';
import type { AutoFormFieldProps } from '../react';
import type { FieldConfigCustomData, SourceConfig } from '../utils';

const useMultiSourceOptions = (sources: SourceConfig[], useGet: UseGet) => {
  const business = useBusinessSafe();
  const basePath = business?.business?.basePath ?? '';

  // Map each source to a useGet call
  const queryResults = sources.map((source) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    // biome-ignore lint/correctness/useHookAtTopLevel: lint debt cleanup
    const { data = [], ...rest } = useGet(
      {
        key: source.table || 'business',
        queryOptions: {
          enabled: !!basePath && !!source.table,
        },
      },
      basePath,
    );

    // Transform raw data into [value, label] format based on source config
    // NOTE: This includes ALL products, even those with zero stock,
    // to ensure they can be selected during import operations
    const formattedOptions = data.map((rawItem) => {
      const item = (rawItem ?? {}) as Record<string, unknown>;
      const soul =
        ((item._ as { soul?: string } | undefined)?.soul as
          | string
          | undefined) ?? '';
      let label = '';

      if ('displayKeys' in source) {
        // Handle display keys, ensuring that even zero values are displayed
        label =
          source.displayKeys
            .map((k) => {
              const value = item[k as string];
              // Convert undefined/null values to empty string, but keep zero values
              return value === null || value === undefined ? '' : String(value);
            })
            .join(source.separator ?? ' - ') + (source.suffix ?? '');
      } else {
        label = String(item[source.displayKey as string] ?? '');
      }

      return [soul, label] as [string, string];
    });

    return { formattedOptions, ...rest };
  });

  const combinedOptions = queryResults.flatMap((r) => r.formattedOptions);
  const isLoading = queryResults.some((r) => r.isLoading);

  return { options: combinedOptions, isLoading };
};

const _SelectField: React.FC<
  AutoFormFieldProps & {
    useGet: UseGet;
  }
> = ({ field, inputProps, error, value, path, useGet }) => {
  const business = useBusinessSafe();
  const props = inputProps;
  const customData = field.fieldConfig?.customData as FieldConfigCustomData;
  const defaultValues = useAutoFormDefaultValues();

  const sources =
    customData && 'sources' in customData
      ? customData.sources || (customData.source ? [customData.source] : [])
      : customData?.source
        ? [customData.source]
        : [];

  const { options: fetchedOptions } = useMultiSourceOptions(sources, useGet);

  function getOptions(): typeof field.options {
    if (customData && 'sources' in customData) {
      return fetchedOptions;
    }
    return (customData?.options as typeof field.options) || field.options;
  }

  const options = getOptions();
  const form = useFormContext();
  const currentValue = String(value ?? field.default ?? '');
  const lockedValues = customData?.disableWhenValueIn;
  const isLocked =
    lockedValues &&
    Array.isArray(lockedValues) &&
    lockedValues.includes(defaultValues[field.key]);

  return (
    <Combobox
      {...props}
      options={options?.map(([value, label]) => ({
        value,
        label,
      }))}
      value={currentValue}
      onValueChange={(value) => {
        runFieldOnValueChange({
          customData,
          value,
          path,
          form,
          businessBasePath: business?.business?.basePath,
        });
        const syntheticEvent = {
          target: {
            value,
            name: path.join('.'),
          },
        } as React.ChangeEvent<HTMLInputElement>;
        props.onChange(syntheticEvent);
      }}
      className={error ? 'border-destructive' : ''}
      disabled={props.disabled || isLocked}
      testId={inputProps?.['data-testid']}
    />
  );
};

export const SelectField: React.FC<AutoFormFieldProps> = ({ ...props }) => {
  const { data: useGet } = useQuery({
    queryKey: ['getUseGet'],
    async queryFn() {
      return import('@/lib/gun/hooks').then(({ useGet }) => {
        return useGet;
      });
    },
  });

  if (!useGet) return null;

  return <_SelectField useGet={useGet} {...props} />;
};
