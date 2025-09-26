import type { Business } from "@/lib/schema";
import { getAppIcon } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { ImageOff } from "lucide-react";
import { memo } from "react";

interface AppGridProps {
	businesses: Business[];
	gridColumns: number;
	iconSize: "sm" | "md" | "lg";
}

function AppGridComponent({ businesses, gridColumns, iconSize }: AppGridProps) {
	// Size classes mapping
	const iconSizeClasses = {
		sm: "w-10 h-10",
		md: "w-12 h-12",
		lg: "w-16 h-16",
	};

	const gridColumnClasses: Record<number, string> = {
		1: "grid-cols-1",
		2: "grid-cols-2",
		3: "grid-cols-3",
		4: "grid-cols-4",
		5: "grid-cols-5",
		6: "grid-cols-6",
		7: "grid-cols-7",
		8: "grid-cols-8",
	};

	return (
		<div className={`grid ${gridColumnClasses[gridColumns] || `grid-cols-${gridColumns}`} gap-4`}>
			{businesses.map((business: Business) => {
				const icon = getAppIcon(business);

				return (
					<Link
						key={business._?.soul}
						to="/$businessName"
						params={{ businessName: business.basePath ?? "" }}
						className="flex flex-col items-center"
					>
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
						<span>{business.name}</span>
					</Link>
				);
			})}
		</div>
	);
}

export const AppGrid = memo(AppGridComponent);
