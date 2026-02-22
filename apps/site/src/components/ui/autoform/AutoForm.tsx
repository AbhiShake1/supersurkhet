import React from 'react';
import { ArrayElementWrapper } from './components/ArrayElementWrapper';
import { ArrayWrapper } from './components/ArrayWrapper';
import { BooleanField } from './components/BooleanField';
import { ClassNameField } from './components/ClassNameField';
import { ColorField } from './components/ColorField';
import { CurrencyField } from './components/CurrencyField';
import { DateField } from './components/DateField';
import { DateTimeField } from './components/DateTimeField';
import { EditorField } from './components/EditorField';
import { ErrorMessage } from './components/ErrorMessage';
import {
  FieldWrapper,
  FieldWrapperWithoutLabel,
} from './components/FieldWrapper';
import { FileUploadField } from './components/FileUploadField';
import { Form } from './components/Form';
import { ImageUploadField } from './components/ImageUploadField';
import { MapField } from './components/MapField';
import { NumberField } from './components/NumberField';
import { ObjectWrapper } from './components/ObjectWrapper';
import { PasswordField } from './components/PasswordField';
import { PermissionsField } from './components/PermissionsField';
import { PhoneField } from './components/PhoneField';
import { RatingField } from './components/RatingField';
import { RecordField } from './components/RecordField';
import { RichTextField } from './components/RichTextField';
import { SelectField } from './components/SelectField';
import { SliderField } from './components/SliderField';
import { StringField } from './components/StringField';
import { SubmitButton } from './components/SubmitButton';
import { TagsField } from './components/TagsField';
import { UnitField } from './components/UnitField';
import { UrlField } from './components/UrlField';
import { type AutoFormUIComponents, AutoForm as BaseAutoForm } from './react';
import type { AutoFormProps } from './types';
import { type ZodObjectOrWrapped, ZodProvider } from './zod';

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
  className: ClassNameField,
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
export const AUTOFORM_FIELD_TYPES = Object.keys(
  ShadcnAutoFormFieldComponents,
) as [FieldTypes, ...FieldTypes[]];

export function AutoFormWithoutLabel<F extends ZodObjectOrWrapped>({
  uiComponents,
  formComponents,
  schema,
  onSubmit,
  ...props
}: AutoFormProps<F>) {
  const defaultValues = React.useMemo(
    () => props.defaultValues ?? props.values ?? {},
    [props.defaultValues, props.values],
  );
  const schemaProvider = React.useMemo(() => new ZodProvider(schema), [schema]);
  const mergedUiComponents = React.useMemo(
    () => ({
      ...ShadcnUIComponents,
      FieldWrapper: FieldWrapperWithoutLabel,
      ...uiComponents,
    }),
    [uiComponents],
  );
  const mergedFormComponents = React.useMemo(
    () => ({ ...ShadcnAutoFormFieldComponents, ...formComponents }),
    [formComponents],
  );

  return (
    <AutoFormDefaultValueProvider defaultValues={defaultValues}>
      <BaseAutoForm
        {...props}
        onSubmit={onSubmit}
        schema={schemaProvider}
        uiComponents={mergedUiComponents}
        formComponents={mergedFormComponents}
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
  const defaultValues = React.useMemo(
    () => props.defaultValues ?? props.values ?? {},
    [props.defaultValues, props.values],
  );
  const schemaProvider = React.useMemo(
    () => (schema ? new ZodProvider(schema) : null),
    [schema],
  );
  const mergedUiComponents = React.useMemo(
    () => ({ ...ShadcnUIComponents, FieldWrapper, ...uiComponents }),
    [uiComponents],
  );
  const mergedFormComponents = React.useMemo(
    () => ({ ...ShadcnAutoFormFieldComponents, ...formComponents }),
    [formComponents],
  );
  if (!schemaProvider) return null;

  return (
    <AutoFormDefaultValueProvider defaultValues={defaultValues}>
      <BaseAutoForm
        {...props}
        schema={schemaProvider}
        uiComponents={mergedUiComponents}
        formComponents={mergedFormComponents}
      />
    </AutoFormDefaultValueProvider>
  );
}

type AutoFormDefaultValues = Record<string, any>;

const AutoFormDefaultValuesContext = React.createContext<
  AutoFormDefaultValues | undefined
>(undefined);

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
  if (!defaultValues)
    throw new Error(
      'useAutoFormDefaultValues must be used within AutoFormDefaultValueProvider',
    );
  return defaultValues;
}
