import {
	AutoForm as BaseAutoForm,
	type AutoFormUIComponents,
} from "@autoform/react";
import { ZodProvider, type ZodObjectOrWrapped } from "@autoform/zod";
import { ZodObject } from "zod";
import { ArrayElementWrapper } from "./components/ArrayElementWrapper";
import { ArrayWrapper } from "./components/ArrayWrapper";
import { BooleanField } from "./components/BooleanField";
import { DateField } from "./components/DateField";
import { ErrorMessage } from "./components/ErrorMessage";
import { FieldWrapper, FieldWrapperWithoutLabel } from "./components/FieldWrapper";
import { Form } from "./components/Form";
import { ImageUploadField } from "./components/ImageUploadField";
import { NumberField } from "./components/NumberField";
import { ObjectWrapper } from "./components/ObjectWrapper";
import { RecordField } from "./components/RecordField";
import { SelectField } from "./components/SelectField";
import { StringField } from "./components/StringField";
import { SubmitButton } from "./components/SubmitButton";
import type { AutoFormProps } from "./types";

const ShadcnUIComponents: Omit<AutoFormUIComponents, "FieldWrapper"> = {
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
	select: SelectField,
	image: ImageUploadField,
	record: RecordField,
} as const;
export type FieldTypes = keyof typeof ShadcnAutoFormFieldComponents;

export function AutoFormWithoutLabel<F extends ZodObjectOrWrapped>({
	uiComponents,
	formComponents,
	schema,
	...props
}: AutoFormProps<F>) {
	return (
		<BaseAutoForm
			{...props}
			schema={
				new ZodProvider(
					schema instanceof ZodObject ?
						// omit default fields of schema
						schema.omit({ _: true, created_by: true, timestamp: true })
						: schema,
				)
			}
			uiComponents={{ ...ShadcnUIComponents, FieldWrapper: FieldWrapperWithoutLabel, ...uiComponents }}
			formComponents={{ ...ShadcnAutoFormFieldComponents, ...formComponents }}
		/>
	);
}

export function AutoForm<F extends ZodObjectOrWrapped>({
	uiComponents,
	formComponents,
	schema,
	...props
}: AutoFormProps<F>) {
	return (
		<BaseAutoForm
			{...props}
			schema={
				new ZodProvider(
					schema instanceof ZodObject ?
						// omit default fields of schema
						schema.omit({ _: true, created_by: true, timestamp: true })
						: schema,
				)
			}
			uiComponents={{ ...ShadcnUIComponents, FieldWrapper, ...uiComponents }}
			formComponents={{ ...ShadcnAutoFormFieldComponents, ...formComponents }}
		/>
	);
}
