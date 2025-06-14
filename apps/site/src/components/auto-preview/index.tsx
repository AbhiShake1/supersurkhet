import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { type ParsedField } from "@autoform/core"
import type { ZodObjectOrWrapped } from "@autoform/zod"
import { type FC, type ReactNode } from "react"
import { z } from "zod"
import { AutoTable } from "../auto-table"
import { fieldConfig } from "../ui/autoform"
import { Credenza, CredenzaContent, CredenzaTrigger } from "../ui/credenza"

type FieldType = NonNullable<Parameters<typeof fieldConfig>[0]["fieldType"]>

export type AutoPreviewComponent<T, S extends ParsedField = any> = FC<{ value: T, schema: S }>

export function AutoPreview<T>({ field, value, baseSchema: schema }: { field: ParsedField, value: T, baseSchema: ZodObjectOrWrapped }): ReactNode {
    // @ts-expect-error
    const Comp = autoPreviewComponents[field.type] ?? autoPreviewComponents.fallback

    return !value ? autoPreviewComponents.fallback({ value, schema }) as ReactNode : <Comp value={value} schema={schema} />
}

const DatePreview: AutoPreviewComponent<Date> = ({ value }) => value.toLocaleString()

const ImagePreview: AutoPreviewComponent<string> = ({ value }) => {
    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" className="p-0 h-auto">
                    <img src={value} alt="preview" className="max-h-[100px] w-auto object-contain" />
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] max-h-[90vh]">
                <img
                    src={value}
                    alt="preview"
                    className="w-full h-full object-contain"
                />
            </DialogContent>
        </Dialog>
    )
}
const NumberPreview: AutoPreviewComponent<number> = ({ value }) => <>{value}</>
const SelectPreview: AutoPreviewComponent<string> = ({ value }) => value
const StringPreview: AutoPreviewComponent<string> = ({ value }) => <>{value}</>
const RecordPreview: AutoPreviewComponent<object> = ({ value, schema }) => {
    if (!("#" in value)) return null
    if ("#" in value && typeof value["#"] !== "string") return null
    const isEffect = schema instanceof z.ZodEffects
    if (!isEffect) return null
    const fullKey = value["#"] as string
    const parsedSchema = schema.innerType()._def.valueType
    return <Credenza>
        <CredenzaTrigger asChild>
            <button>Click to expand</button>
        </CredenzaTrigger>
        <CredenzaContent className="overflow-scroll">
            <AutoTable slug={fullKey} parsedSchema={parsedSchema} />
        </CredenzaContent>
    </Credenza>
}

const autoPreviewComponents: Record<FieldType | "fallback", AutoPreviewComponent<any>> = {
    boolean: ({ value }) => value ? "yes" : "no",
    date: DatePreview,
    image: ImagePreview,
    number: NumberPreview,
    select: SelectPreview,
    string: StringPreview,
    record: RecordPreview,
    fallback: () => "-",
}