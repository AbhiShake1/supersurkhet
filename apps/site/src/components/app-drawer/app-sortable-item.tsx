import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "../ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { Link } from "@tanstack/react-router";
import { ImageOff, GripVertical } from "lucide-react";
import { getAppIcon } from "@/lib/utils";
import type { Business } from "@/lib/schema";

interface AppSortableItemProps {
	id: string;
	business: Business;
	iconSize: "sm" | "md" | "lg";
	iconSizeClasses: {
		sm: string;
		md: string;
		lg: string;
	};
}

export function AppSortableItem({
	id,
	business,
	iconSize,
	iconSizeClasses,
}: AppSortableItemProps) {
	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
	} = useSortable({ id });

	const style = {
		transform: CSS.Transform.toString(transform),
		transition,
		opacity: isDragging ? 0.5 : 1,
	};

	const icon = getAppIcon(business);

	return (
		<Card
			ref={setNodeRef}
			style={style}
			className="relative flex flex-col cursor-grab active:cursor-grabbing"
		>
			<CardHeader className="pb-2 flex flex-row items-center gap-3">
				<div {...attributes} {...listeners} className="cursor-grab" aria-label={`Reorder ${business.name}`}>
					<GripVertical className="h-4 w-4 text-muted-foreground" />
				</div>
				{icon ? (
					<div
						className={`${iconSizeClasses[iconSize]} rounded-md overflow-hidden flex items-center justify-center flex-shrink-0`}
					>
						<img
							src={icon}
							alt={business.name}
							className="w-full h-full object-cover"
							loading="lazy"
							onError={(e) => {
								// Fallback to a default image or icon if the image fails to load
								const target = e.target as HTMLImageElement;
								target.onerror = null; // Prevent infinite loop if fallback also fails
								target.src = "/placeholder-icon.png"; // Use a default icon
							}}
						/>
					</div>
				) : (
					<div
						className={`${iconSizeClasses[iconSize]} rounded-md bg-muted flex items-center justify-center flex-shrink-0`}
					>
						<ImageOff className="h-1/2 w-1/2 text-muted-foreground" />
					</div>
				)}
				<div className="flex-1 min-w-0">
					<CardTitle className="text-sm truncate">{business.name}</CardTitle>
					{business.location && (
						<CardDescription className="text-xs truncate">
							{business.location}
						</CardDescription>
					)}
				</div>
				<Badge
					variant="secondary"
					className="absolute top-3 right-3 capitalize text-xs px-2 py-1 rounded-full"
				>
					{business.businessType.replace(/_/g, " ")}
				</Badge>
			</CardHeader>
			<CardContent className="flex-grow flex flex-col justify-end pt-0">
				{business.basePath ? (
					<Button asChild className="w-full">
						<Link
							to="/$businessName"
							params={{ businessName: business.basePath }}
						>
							Visit
						</Link>
					</Button>
				) : (
					<Button className="w-full" disabled>
						Visit
					</Button>
				)}
			</CardContent>
		</Card>
	);
}
