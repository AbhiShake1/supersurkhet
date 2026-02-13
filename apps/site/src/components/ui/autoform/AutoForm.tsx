import { AutoForm as BaseAutoForm, type AutoFormUIComponents } from './react';
import { ZodProvider, type ZodObjectOrWrapped } from '@autoform/zod';
import { ArrayElementWrapper } from './components/ArrayElementWrapper';
import { ArrayWrapper } from './components/ArrayWrapper';
import { BooleanField } from './components/BooleanField';
import { DateField } from './components/DateField';
import { DateTimeField } from './components/DateTimeField';
import { ErrorMessage } from './components/ErrorMessage';
import {
  FieldWrapper,
  FieldWrapperWithoutLabel,
} from './components/FieldWrapper';
import { Form } from './components/Form';
import { ImageUploadField } from './components/ImageUploadField';
import { MapField } from './components/MapField';
import { NumberField } from './components/NumberField';
import { ObjectWrapper } from './components/ObjectWrapper';
import { RecordField } from './components/RecordField';
import { SelectField } from './components/SelectField';
import { StringField } from './components/StringField';
import { SubmitButton } from './components/SubmitButton';
import type { AutoFormProps } from './types';
import { RichTextField } from './components/RichTextField';
import { EditorField } from './components/EditorField';
import { ColorField } from './components/ColorField';
import { FileUploadField } from './components/FileUploadField';
import { RatingField } from './components/RatingField';
import { SliderField } from './components/SliderField';
import { TagsField } from './components/TagsField';
import { CurrencyField } from './components/CurrencyField';
import { PhoneField } from './components/PhoneField';
import { UrlField } from './components/UrlField';
import { PasswordField } from './components/PasswordField';
import { PermissionsField } from './components/PermissionsField';
import { UnitField } from './components/UnitField';
import React from 'react';

const ShadcnUIComponents: Omit<AutoFormUIComponents, 'FieldWrapper'> = {
  Form,
  ErrorMessage,
  SubmitButton,
  ObjectWrapper,
  ArrayWrapper,
  ArrayElementWrapper,
};

export const ShadcnAutoFormFieldComponents = {
  string: StringField,
  number: NumberField,
  boolean: BooleanField,
  date: DateField,
  datetime: DateTimeField,
  select: SelectField,
  image: ImageUploadField,
  map: MapField,
  record: RecordField,
  password: PasswordField,
  richText: RichTextField,
  editor: EditorField,
  color: ColorField,
  file: FileUploadField,
  rating: RatingField,
  slider: SliderField,
  tags: TagsField,
  currency: CurrencyField,
  phone: PhoneField,
  url: UrlField,
  permissions: PermissionsField,
  unit: UnitField,
  timestamp: () => null,
} as const;
export type FieldTypes = keyof typeof ShadcnAutoFormFieldComponents;

export function AutoFormWithoutLabel<F extends ZodObjectOrWrapped>({
  uiComponents,
  formComponents,
  schema,
  onSubmit,
  ...props
}: AutoFormProps<F>) {
  return (
    <AutoFormDefaultValueProvider defaultValues={props.defaultValues ?? props.values ?? {}}>
      <BaseAutoForm
        {...props}
        onSubmit={onSubmit}
        schema={new ZodProvider(schema)}
        uiComponents={{
          ...ShadcnUIComponents,
          FieldWrapper: FieldWrapperWithoutLabel,
          ...uiComponents,
        }}
        formComponents={{ ...ShadcnAutoFormFieldComponents, ...formComponents }}
      >
        {props.children}
      </BaseAutoForm>
    </AutoFormDefaultValueProvider>
  );
}

export function AutoForm<F extends ZodObjectOrWrapped>({
  uiComponents,
  formComponents,
  schema,
  ...props
}: AutoFormProps<F>) {
  if (!schema) return null;
  return (
    <AutoFormDefaultValueProvider defaultValues={props.defaultValues ?? props.values ?? {}}>
      <BaseAutoForm
        {...props}
        schema={new ZodProvider(schema)}
        uiComponents={{ ...ShadcnUIComponents, FieldWrapper, ...uiComponents }}
        formComponents={{ ...ShadcnAutoFormFieldComponents, ...formComponents }}
      />
    </AutoFormDefaultValueProvider>
  );
}

type AutoFormDefaultValues = Record<string, any>;

const AutoFormDefaultValuesContext =
  React.createContext<AutoFormDefaultValues | undefined>(undefined);

export function AutoFormDefaultValueProvider({
  defaultValues,
  children,
}: {
  defaultValues: AutoFormDefaultValues;
  children: React.ReactNode;
}) {
  return (
    <AutoFormDefaultValuesContext.Provider value={defaultValues}>
      {children}
    </AutoFormDefaultValuesContext.Provider>
  );
}

export function useAutoFormDefaultValues(): AutoFormDefaultValues {
  const defaultValues = React.useContext(AutoFormDefaultValuesContext);
  if (!defaultValues) throw new Error('useAutoFormDefaultValues must be used within AutoFormDefaultValueProvider');
  return defaultValues;
}
