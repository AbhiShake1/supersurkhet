import type { Row } from "@tanstack/react-table";
import { Trash } from "lucide-react";
import type * as React from "react";

import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";

interface DeleteRowDialogProps<T>
	extends React.ComponentPropsWithoutRef<typeof Dialog> {
	data: Row<T>["original"][];
	showTrigger?: boolean;
	onConfirm: () => void;
}

export function DeleteRowDialog<T>({
	data,
	showTrigger = true,
	onConfirm,
	...props
}: DeleteRowDialogProps<T>) {
	const isDesktop = useMediaQuery("(min-width: 640px)");

	if (isDesktop) {
		return (
			<Dialog {...props}>
				{showTrigger ? (
					<DialogTrigger asChild>
						<Button variant="outline" size="sm">
							<Trash
								className="mr-2 size-4 text-destructive"
								aria-hidden="true"
							/>
							Delete ({data.length})
						</Button>
					</DialogTrigger>
				) : null}
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Are you absolutely sure?</DialogTitle>
						<DialogDescription>
							This action cannot be undone. This will permanently delete your{" "}
							<span className="font-medium">{data.length}</span>
							{data.length === 1 ? " row" : " rows"} from our network.
						</DialogDescription>
					</DialogHeader>
					<DialogFooter className="gap-2 sm:space-x-0">
						<DialogClose asChild>
							<Button variant="outline">Cancel</Button>
						</DialogClose>
						<Button
							aria-label="Delete selected rows"
							variant="destructive"
							onClick={onConfirm}
							// disabled={isDeletePending}
						>
							{/* {isDeletePending && (
                <Loader
                  className="mr-2 size-4 animate-spin"
                  aria-hidden="true"
                />
              )} */}
							Delete
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		);
	}

	return (
		<Drawer {...props}>
			{showTrigger ? (
				<DrawerTrigger asChild>
					<Button variant="outline" size="sm">
						<Trash
							className="mr-2 size-4 text-destructive"
							aria-hidden="true"
						/>
						Delete ({data.length})
					</Button>
				</DrawerTrigger>
			) : null}
			<DrawerContent>
				<DrawerHeader>
					<DrawerTitle>Are you absolutely sure?</DrawerTitle>
					<DrawerDescription>
						This action cannot be undone. This will permanently delete your{" "}
						<span className="font-medium">{data.length}</span>
						{data.length === 1 ? " row" : " rows"} from our network.
					</DrawerDescription>
				</DrawerHeader>
				<DrawerFooter className="gap-2 sm:space-x-0">
					<DrawerClose asChild>
						<Button variant="outline">Cancel</Button>
					</DrawerClose>
					<Button
						aria-label="Delete selected rows"
						variant="destructive"
						onClick={onConfirm}
						// disabled={isDeletePending}
					>
						{/* {isDeletePending && (
              <Loader className="mr-2 size-4 animate-spin" aria-hidden="true" />
            )} */}
						Delete
					</Button>
				</DrawerFooter>
			</DrawerContent>
		</Drawer>
	);
}
