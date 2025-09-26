import { memo } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "../ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../ui/card";
import { Badge } from "../ui/badge";
import { ImageOff } from "lucide-react";
import type { Business } from "@/lib/schema";
import { getAppIcon } from "@/lib/utils";

interface AppListProps {
	businesses: Business[];
	iconSize: "sm" | "md" | "lg";
}

function AppListComponent({ businesses, iconSize }: AppListProps) {
	// Size classes mapping
	const iconSizeClasses = {
		sm: "w-10 h-10",
		md: "w-12 h-12",
		lg: "w-16 h-16",
	};

	return (
		<div className="space-y-4">
			{businesses.map((business: Business) => {
				const icon = getAppIcon(business);

				return (
					<Card key={business._?.soul} className="flex">
						<CardHeader className="flex flex-row items-center gap-3 p-4 flex-shrink-0">
							{icon ? (
								<div
									className={`${iconSizeClasses[iconSize]} rounded-md overflow-hidden flex items-center justify-center`}
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
									className={`${iconSizeClasses[iconSize]} rounded-md bg-muted flex items-center justify-center`}
								>
									<ImageOff className="h-1/2 w-1/2 text-muted-foreground" />
								</div>
							)}
						</CardHeader>
						<div className="flex-1 flex flex-col justify-center">
							<CardTitle>{business.name}</CardTitle>
							{business.location && (
								<CardDescription className="text-sm">
									{business.location}
								</CardDescription>
							)}
							<Badge
								variant="secondary"
								className="self-start mt-2 capitalize text-xs px-2 py-1 rounded-full"
							>
								{business.businessType.replace(/_/g, " ")}
							</Badge>
						</div>
						<CardContent className="flex items-center p-4">
							{business.basePath ? (
								<Button asChild>
									<Link
										to="/$businessName"
										params={{ businessName: business.basePath }}
									>
										Visit
									</Link>
								</Button>
							) : (
								<Button disabled>
									Visit
								</Button>
							)}
						</CardContent>
					</Card>
				)
			})}
		</div>
	);
}

export const AppList = memo(AppListComponent);
