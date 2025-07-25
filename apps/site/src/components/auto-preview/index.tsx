import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import type { ParsedField } from "@autoform/core";
import type { ZodObjectOrWrapped } from "@autoform/zod";
import { CheckCircle2, XCircle } from "lucide-react";
import type { FC, ReactNode } from "react";
import { z } from "zod";
import { AutoTable } from "../auto-table";
import type { fieldConfig } from "../ui/autoform";
import { Drawer, DrawerContent, DrawerTrigger } from "../ui/drawer";

type FieldType = NonNullable<Parameters<typeof fieldConfig>[0]["fieldType"]>;

export type AutoPreviewComponent<T, S extends ParsedField = ParsedField> = FC<{
	value: T;
	schema: S;
}>;

export function AutoPreview<T>({
	field,
	value,
	baseSchema: schema,
}: {
	field: ParsedField;
	value: T;
	baseSchema: ZodObjectOrWrapped;
}): ReactNode {
	const Comp =
		// @ts-expect-error
		autoPreviewComponents[field.type] ?? autoPreviewComponents.fallback;

	return <Comp value={value} schema={schema} />;
}

const DatePreview: AutoPreviewComponent<Date> = ({ value }) =>
	value.toLocaleString();

const ImagePreview: AutoPreviewComponent<string> = ({ value }) => {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="ghost" className="h-auto p-0">
					<img
						src={value}
						alt="preview"
						className="max-h-[100px] w-auto object-contain"
					/>
				</Button>
			</DialogTrigger>
			<DialogContent className="max-h-[90vh] max-w-[90vw]">
				<img
					src={value}
					alt="preview"
					className="h-full w-full object-contain"
				/>
			</DialogContent>
		</Dialog>
	);
};
const NumberPreview: AutoPreviewComponent<number> = ({ value }) => <>{value}</>;
const SelectPreview: AutoPreviewComponent<string> = ({ value }) => value;
const StringPreview: AutoPreviewComponent<string> = ({ value }) => <>{value}</>;
const RecordPreview: AutoPreviewComponent<object> = ({ value, schema }) => {
	if (!value) return null
	if (!("#" in value)) return null;
	if (typeof value["#"] !== "string") return null;
	const isEffect = schema instanceof z.ZodEffects;
	if (!isEffect) return null;
	const fullKey = value["#"]
	const parsedSchema = schema.innerType()._def.valueType;
	return (
		<Drawer>
			<DrawerTrigger asChild>
				<button type="button">Click to expand</button>
			</DrawerTrigger>
			<DrawerContent className="overflow-scroll">
				<AutoTable slug={fullKey} parsedSchema={parsedSchema} />
			</DrawerContent>
		</Drawer>
	);
};

const BooleanPreview: AutoPreviewComponent<boolean> = ({ value }) => {
	return value ? (
		<CheckCircle2 className="text-green-500 size-4 w-full" />
	) : (
		<XCircle className="text-destructive w-full size-4" />
	);
};

const autoPreviewComponents: Record<
	FieldType | "fallback",
	AutoPreviewComponent<any>
> = {
	boolean: BooleanPreview,
	date: DatePreview,
	image: ImagePreview,
	number: NumberPreview,
	select: SelectPreview,
	string: StringPreview,
	record: RecordPreview,
	fallback: () => "-",
};
