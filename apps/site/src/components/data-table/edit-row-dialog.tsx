import { AutoForm } from "@/components/ui/autoform";
import { SubmitButton } from "@/components/ui/autoform/components/SubmitButton";
import { Button } from "@/components/ui/button";
import {
	Credenza,
	CredenzaBody,
	CredenzaContent,
	CredenzaDescription,
	CredenzaFooter,
	CredenzaHeader,
	CredenzaTitle,
} from "@/components/ui/credenza";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Save } from "lucide-react";
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
		<Credenza open={open} onOpenChange={onOpenChange}>
			<CredenzaContent>
				<CredenzaHeader>
					<CredenzaTitle>Edit</CredenzaTitle>
					<CredenzaDescription>Edit details</CredenzaDescription>
				</CredenzaHeader>
				<CredenzaBody asChild>
					<ScrollArea className="h-[50vh]">
						<AutoForm
							formProps={{ id: "edit-row-form" }}
							schema={schema}
							defaultValues={data || {}}
							onSubmit={(values) => {
								onSubmit(values as T);
								onOpenChange(false);
							}}
						/>
					</ScrollArea>
				</CredenzaBody>
				<CredenzaFooter className="flex gap-4 pt-4">
					<Button
						type="button"
						variant="outline"
						className="w-full"
						onClick={() => onOpenChange(false)}
					>
						Cancel
					</Button>
					<SubmitButton form="edit-row-form" className="gap-2 w-full">
						<Save className="size-4" />
						Save
					</SubmitButton>
				</CredenzaFooter>
			</CredenzaContent>
		</Credenza>
	);
}
