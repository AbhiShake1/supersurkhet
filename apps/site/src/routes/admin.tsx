import { AutoTable } from "@/components/auto-table";
import { AutoForm } from "@/components/ui/autoform";
import { SubmitButton } from "@/components/ui/autoform/components/SubmitButton";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBusiness } from "@/hooks/use-business";
import { businessSchema } from "@/lib/schema";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Save } from "lucide-react";
import { useState } from "react";
import type { z } from "zod";

export const Route = createFileRoute("/admin")({
	component: RouteComponent,
});

function RouteComponent() {
	const [dialogOpen, setDialogOpen] = useState(false);
	const { businesses, createBusiness, updateBusiness, deleteBusiness } =
		useBusiness();

	return (
		<div className="container mx-auto py-6 space-y-4 flex flex-col items-end">
			<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
				<DialogTrigger asChild>
					<Button className="w-min">
						<Plus className="w-5 h-5" />
						Add Business
					</Button>
				</DialogTrigger>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Add Business</DialogTitle>
						<DialogDescription>Add a new business</DialogDescription>
					</DialogHeader>
					<ScrollArea className="relative max-h-[70vh]">
						<AutoForm
							schema={businessSchema}
							onSubmit={(b) => (setDialogOpen(false), createBusiness(b))}
						>
							<DialogFooter className="absolute bottom-0 right-2">
								<SubmitButton>
									<Save />
									Save
								</SubmitButton>
							</DialogFooter>
						</AutoForm>
					</ScrollArea>
				</DialogContent>
			</Dialog>
			<AutoTable
				slug="root1"
				schema="business"
			/>
		</div>
	);
}
