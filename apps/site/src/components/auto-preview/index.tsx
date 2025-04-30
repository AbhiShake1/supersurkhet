import { type ParsedField } from "@autoform/core"
import type { FC, ReactNode } from "react"
import { fieldConfig } from "../ui/autoform"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"

type FieldType = NonNullable<Parameters<typeof fieldConfig>[0]["fieldType"]>

export type AutoPreviewComponent<T> = FC<{ value: T }>

export function AutoPreview<T>({ field, value }: { field: ParsedField, value: T }): ReactNode {
    // @ts-expect-error
    const Comp = autoPreviewComponents[field.type] ?? autoPreviewComponents.fallback

    return !value ? autoPreviewComponents.fallback({ value }) as ReactNode : <Comp value={value} />
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
const StringPreview: AutoPreviewComponent<string> = ({ value }) => <>{value}a</>

const autoPreviewComponents: Record<FieldType | "fallback", AutoPreviewComponent<any>> = {
    boolean: ({ value }) => value ? "yes" : "no",
    date: DatePreview,
    image: ImagePreview,
    number: NumberPreview,
    select: SelectPreview,
    string: StringPreview,
    fallback: () => "-",
}