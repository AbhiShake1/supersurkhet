import { useBusinessSafe } from '@/contexts/business-context';
import type React from 'react';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { Combobox } from '../../combobox';
import type { AutoFormFieldProps } from '../react';
import type { FieldConfigCustomData, SourceConfig } from '../utils';
import { useQuery } from '@tanstack/react-query';
import type { SchemaKeys, UseGet } from '@/lib/gun/index';

const useMultiSourceOptions = (sources: SourceConfig[], useGet: UseGet) => {
  const business = useBusinessSafe();
  const basePath = business?.business?.basePath ?? '';

  // Map each source to a useGet call
  const queryResults = sources.map((source) => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
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
    const formattedOptions = data.map((item) => {
      const soul = item?._?.soul ?? '';
      let label = '';

      if ('displayKeys' in source) {
        label =
          source.displayKeys
            .map((k: string) => item[k] || '')
            .join(source.separator ?? ' - ') + (source.suffix ?? '');
      } else {
        label = item[source.displayKey] || '';
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
> = ({ field, inputProps, error, id, value, path, useGet }) => {
  const { key, ...props } = inputProps;
  const customData = field.fieldConfig?.customData as FieldConfigCustomData;

  const sources =
    customData && 'sources' in customData ? customData.sources || [] : [];

  const { options: fetchedOptions } = useMultiSourceOptions(sources, useGet);

  function getOptions(): typeof field.options {
    if (customData && 'sources' in customData) {
      return fetchedOptions;
    }
    return (customData?.options as typeof field.options) || field.options;
  }

  const options = getOptions();
  const form = useFormContext();
  const [innerValue, setInnerValue] = useState(value || field.default);
  const currentValue = form.watch(path.join('.'));
  const lockedValues = customData?.disableWhenValueIn;
  const isLocked =
    Array.isArray(lockedValues) &&
    lockedValues.includes(currentValue ?? innerValue);

  return (
    <Combobox
      {...props}
      options={options?.map(([value, label]) => ({
        value,
        label,
      }))}
      value={innerValue}
      onValueChange={(value) => {
        setInnerValue(value);
        field.fieldConfig?.customData?.onValueChange?.(value, path, form);
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
