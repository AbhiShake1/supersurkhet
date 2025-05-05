import { Save } from "lucide-react";
import { AutoForm } from "@/components/ui/autoform";
import { SubmitButton } from "@/components/ui/autoform/components/SubmitButton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { ZodObject } from "zod";

interface EditRowDialogProps<T, S> {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    data: T | null;
    schema: S;
    onSubmit: (data: T) => void;
    showTrigger?: boolean;
}

export function EditRowDialog<T, S extends ZodObject<any>>({
    open,
    onOpenChange,
    data,
    schema,
    onSubmit,
    showTrigger: _showTrigger = false,
}: EditRowDialogProps<T, S>) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit</DialogTitle>
                    <DialogDescription>Edit details</DialogDescription>
                </DialogHeader>
                <ScrollArea className="relative max-h-[70vh]">
                    <AutoForm
                        schema={schema}
                        defaultValues={data || {}}
                        onSubmit={(values) => {
                            onSubmit(values as T);
                            onOpenChange(false);
                        }}
                    >
                        <DialogFooter className="absolute bottom-0 right-2">
                            <SubmitButton className="gap-2">
                                <Save className="size-4" />
                                Save
                            </SubmitButton>
                        </DialogFooter>
                    </AutoForm>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}