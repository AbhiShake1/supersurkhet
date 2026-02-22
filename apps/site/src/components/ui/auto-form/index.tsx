import { zodResolver } from '@hookform/resolvers/zod';
import React from 'react';
import {
  type DefaultValues,
  type FormState,
  type UseFormReturn,
  useForm,
} from 'react-hook-form';
import type { z } from 'zod';

import { Button, type ButtonProps } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { cn } from '@/lib/utils';

import AutoFormObject from './fields/object';
import type { Dependency, FieldConfig } from './types';
import {
  getDefaultValues,
  getObjectFormSchema,
  type ZodObjectOrWrapped,
} from './utils';

const PARSED_VALUES_CHANGE_DEBOUNCE_MS = 120;

export function AutoFormSubmit({ children, ...props }: ButtonProps) {
  return (
    <Button type="submit" {...props}>
      {children ?? 'Submit'}
    </Button>
  );
}

function AutoForm<SchemaType extends ZodObjectOrWrapped>({
  formSchema,
  values: valuesProp,
  onValuesChange: onValuesChangeProp,
  onParsedValuesChange,
  onSubmit: onSubmitProp,
  fieldConfig,
  children,
  className,
  dependencies,
}: {
  formSchema: SchemaType;
  values?: Partial<z.infer<SchemaType>>;
  onValuesChange?: (
    values: Partial<z.infer<SchemaType>>,
    form: UseFormReturn<z.infer<SchemaType>>,
  ) => void;
  onParsedValuesChange?: (
    values: Partial<z.infer<SchemaType>>,
    form: UseFormReturn<z.infer<SchemaType>>,
  ) => void;
  onSubmit?: (
    values: z.infer<SchemaType>,
    form: UseFormReturn<z.infer<SchemaType>>,
  ) => void;
  fieldConfig?: FieldConfig<z.infer<SchemaType>>;
  children?:
    | React.ReactNode
    | ((formState: FormState<z.infer<SchemaType>>) => React.ReactNode);
  className?: string;
  dependencies?: Dependency<z.infer<SchemaType>>[];
}) {
  const objectFormSchema = getObjectFormSchema(formSchema);
  const defaultValues: DefaultValues<z.infer<typeof objectFormSchema>> | null =
    getDefaultValues(objectFormSchema, fieldConfig);

  const form = useForm<z.infer<typeof objectFormSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: defaultValues ?? undefined,
    values: valuesProp,
  });
  const parseDebounceTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  function onSubmit(values: z.infer<typeof formSchema>) {
    const parsedValues = formSchema.safeParse(values);
    if (parsedValues.success) {
      onSubmitProp?.(parsedValues.data, form);
    }
  }

  React.useEffect(() => {
    if (!onParsedValuesChange) {
      const subscription = form.watch((values) => {
        onValuesChangeProp?.(values, form);
      });
      return () => subscription.unsubscribe();
    }

    const subscription = form.watch((values) => {
      onValuesChangeProp?.(values, form);

      if (parseDebounceTimeoutRef.current) {
        clearTimeout(parseDebounceTimeoutRef.current);
      }

      parseDebounceTimeoutRef.current = setTimeout(() => {
        const parsedValues = formSchema.safeParse(values);
        if (parsedValues.success) {
          onParsedValuesChange(parsedValues.data, form);
        }
      }, PARSED_VALUES_CHANGE_DEBOUNCE_MS);
    });

    return () => {
      if (parseDebounceTimeoutRef.current) {
        clearTimeout(parseDebounceTimeoutRef.current);
        parseDebounceTimeoutRef.current = null;
      }
      subscription.unsubscribe();
    };
  }, [form, formSchema, onValuesChangeProp, onParsedValuesChange]);

  const renderChildren =
    typeof children === 'function'
      ? children(form.formState as FormState<z.infer<SchemaType>>)
      : children;

  return (
    <div className="w-full">
      <Form {...form}>
        <form
          onSubmit={(e) => {
            form.handleSubmit(onSubmit)(e);
          }}
          className={cn('space-y-5', className)}
        >
          <AutoFormObject
            schema={objectFormSchema}
            form={form}
            dependencies={dependencies}
            fieldConfig={fieldConfig}
          />

          {renderChildren}
        </form>
      </Form>
    </div>
  );
}

export default AutoForm;
