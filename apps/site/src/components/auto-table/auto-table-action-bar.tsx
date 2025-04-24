import type { Table } from "@tanstack/react-table";
import { Download, Trash2 } from "lucide-react";
import * as React from "react";

import {
	DataTableActionBar,
	DataTableActionBarAction,
	DataTableActionBarSelection,
} from "@/components/data-table/data-table-action-bar";
import { Separator } from "@/components/ui/separator";
import { exportTableToCSV } from "@/lib/export";

const actions = [
	"update-status",
	"update-priority",
	"export",
	"delete",
] as const;

type Action = (typeof actions)[number];

interface AutoTableActionBarProps<T> {
	table: Table<T>;
	onDelete?: (id: string) => void;
}

export function AutoTableActionBar<T>({ table, onDelete }: AutoTableActionBarProps<T>) {
	const rows = table.getFilteredSelectedRowModel().rows;
	const [isPending, startTransition] = React.useTransition();
	const [currentAction, setCurrentAction] = React.useState<Action | null>(null);

	const getIsActionPending = (action: Action) =>
		isPending && currentAction === action;

	const onExport = () => {
		setCurrentAction("export");
		startTransition(() => {
			exportTableToCSV(table, {
				excludeColumns: ["select", "actions"],
				onlySelected: true,
			});
		});
	};
	
	const deleteSelected = () => {
		setCurrentAction("delete");
		startTransition(() => {
			for (const row of rows) {
				onDelete?.(row.id);
			}
		});
	};

	return (
		<DataTableActionBar table={table} visible={rows.length > 0}>
			<DataTableActionBarSelection table={table} />
			<Separator
				orientation="vertical"
				className="hidden data-[orientation=vertical]:h-5 sm:block"
			/>
			<div className="flex items-center gap-1.5">
				<DataTableActionBarAction
					size="icon"
					tooltip="Export as excel"
					isPending={getIsActionPending("export")}
					onClick={onExport}
				>
					<Download />
				</DataTableActionBarAction>
				<DataTableActionBarAction
					size="icon"
					tooltip="Delete selected"
					isPending={getIsActionPending("delete")}
					onClick={deleteSelected}
				>
					<Trash2 />
				</DataTableActionBarAction>
			</div>
		</DataTableActionBar>
	);
}
