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
import { CredenzaBody } from "../ui/credenza";

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

const DatePreview: AutoPreviewComponent<Date> = ({ value }) => {
	if (!value) return <span className="text-muted-foreground">-</span>;
	
	// If value is a string, try to parse it
	const date = typeof value === 'string' ? new Date(value) : value;
	
	if (isNaN(date.getTime())) {
		return <span className="text-muted-foreground">Invalid Date</span>;
	}
	
	return (
		<span className="font-mono text-sm">
			{date.toLocaleDateString('en-US', { 
				year: 'numeric', 
				month: 'short', 
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			})}
		</span>
	);
};

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
	if (!value) return null;
	if (!("#" in value)) return null;
	if (typeof value["#"] !== "string") return null;
	const isEffect = schema instanceof z.ZodEffects;
	if (!isEffect) return null;
	const fullKey = value["#"];
	const parsedSchema = schema.innerType()._def.valueType;
	return (
		<Drawer>
			<DrawerTrigger asChild>
				<button type="button">Click to expand</button>
			</DrawerTrigger>
			<DrawerContent className="overflow-scroll">
				<CredenzaBody>
					<AutoTable slug={fullKey} parsedSchema={parsedSchema} />
				</CredenzaBody>
			</DrawerContent>
		</Drawer>
	);
};

const BooleanPreview: AutoPreviewComponent<boolean> = ({ value }) => {
	return (
		<div className="flex justify-center">
			{value ? (
				<div className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-100">
					<CheckCircle2 className="size-3.5" />
					Active
				</div>
			) : (
				<div className="inline-flex items-center gap-1.5 rounded-full bg-destructive/20 px-2.5 py-0.5 text-xs font-medium text-destructive">
					<XCircle className="size-3.5" />
					Inactive
				</div>
			)}
		</div>
	);
};

const autoPreviewComponents: Record<
	FieldType | "fallback",
	AutoPreviewComponent<any>
> = {
	boolean: BooleanPreview,
	date: DatePreview,
	datetime: DatePreview,
	image: ImagePreview,
	number: NumberPreview,
	select: SelectPreview,
	string: StringPreview,
	record: RecordPreview,
	password: () => "********",
	fallback: () => "-",
};
