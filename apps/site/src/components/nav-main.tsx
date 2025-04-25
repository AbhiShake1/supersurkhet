"use client";

import { type LucideIcon } from "lucide-react";

import {
	SidebarGroup,
	SidebarMenu,
	SidebarMenuButton,
	SidebarMenuItem
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "@tanstack/react-router";

export interface NavMainProps {
	items: {
		title: string;
		icon?: LucideIcon;
	}[];
}

export function NavMain({ items }: NavMainProps) {
	const { search } = useLocation()
	// @ts-expect-error
	const tab = search.tab as string ?? items[0].title;
	return (
		<SidebarGroup>
			<SidebarMenu>
				{items.map((item) => (
					<SidebarMenuItem>
						<SidebarMenuButton tooltip={item.title} className={cn(tab === item.title && "bg-accent")} asChild>
							{/* @ts-expect-error */}
							<Link to="." search={{ tab: item.title }}>
								{item.icon && <item.icon className={cn("w-4")} />}
								<span>{item.title}</span>
							</Link>
						</SidebarMenuButton>
					</SidebarMenuItem>
				))}
			</SidebarMenu>
		</SidebarGroup>
	);
}
