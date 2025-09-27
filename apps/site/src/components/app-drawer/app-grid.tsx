import type { Business } from "@/lib/schema";
import { getAppIcon } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { AppWindow } from "lucide-react";
import { memo, useState } from "react";
import { useRecentlyUsedApps } from "./recently-used-apps-context";

interface AppGridProps {
	businesses: Business[];
	gridColumns: number;
	iconSize: "sm" | "md" | "lg";
}

function AppGridComponent({ businesses, gridColumns, iconSize }: AppGridProps) {
	// Size classes mapping
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

	const { addRecentlyUsedApp } = useRecentlyUsedApps();

	return (
		<div className={`grid ${gridColumnClasses[gridColumns]} gap-4`}>
			{businesses.map((business) => <BusinessIcon key={business._?.soul} business={business} iconSize={iconSize} addRecentlyUsedApp={addRecentlyUsedApp} />)}
		</div>
	);
}

interface BusinessIconProps {
	business: Business;
	iconSize: "sm" | "md" | "lg";
	addRecentlyUsedApp: (businessId: string) => Promise<void>;
}

function BusinessIcon({ business, iconSize, addRecentlyUsedApp }: BusinessIconProps) {
	const icon = getAppIcon(business);
	const [imageError, setImageError] = useState(false);

	const iconSizeClasses = {
		sm: "w-10 h-10",
		md: "w-12 h-12",
		lg: "w-16 h-16",
	};

	return (
		<Link
			key={business._?.soul}
			to="/$businessName"
			params={{ businessName: business.basePath ?? "" }}
			className="flex flex-col items-center"
			onClick={() => {
				if (business._?.soul) {
					addRecentlyUsedApp(business._.soul);
				}
			}}
		>
			{icon && !imageError ? (
				<div
					className={`${iconSizeClasses[iconSize]} rounded-md overflow-hidden flex items-center justify-center flex-shrink-0`}
				>
					<img
						src={icon}
						alt={business.name}
						className="w-full h-full object-cover"
						loading="lazy"
						onError={() => setImageError(true)}
					/>
				</div>
			) : (
				<div
					className={`${iconSizeClasses[iconSize]} rounded-md bg-muted flex items-center justify-center flex-shrink-0`}
				>
					<AppWindow className="h-1/2 w-1/2 text-muted-foreground" />
				</div>
			)}
			<span>{business.name}</span>
		</Link>
	);
}

export const AppGrid = memo(AppGridComponent);
