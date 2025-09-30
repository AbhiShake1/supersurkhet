import type * as React from "react";
import { useState } from "react";
import { Search } from "lucide-react";

import { NavMain, type NavMainProps } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarInput,
	SidebarRail,
} from "@/components/ui/sidebar";

export type SidebarItems = {
	items: NavMainProps["items"];
	// teams: TeamSwitcherProps["teams"];
	// navMain: NavMainProps["items"];
	// projects: NavProjectsProps["projects"];
};

export function AppSidebar({
	data,
	...props
}: React.ComponentProps<typeof Sidebar> & { data: SidebarItems }) {
	const [searchQuery, setSearchQuery] = useState("");

	// Filter items based on search query using regex
	const filteredItems = searchQuery
		? data.items.filter((item) => {
			try {
				const regex = new RegExp(searchQuery, "i"); // case-insensitive search
				return regex.test(item.title);
			} catch (e) {
				// If the regex is invalid, fallback to simple string includes
				return item.title.toLowerCase().includes(searchQuery.toLowerCase());
			}
		})
		: data.items;

	return (
		<Sidebar {...props}>
			{/* <SidebarHeader>
				<TeamSwitcher teams={data.teams} />
			</SidebarHeader> */}
			<SidebarContent>
				<div className="px-2 py-1 relative">
					<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
					<SidebarInput
						placeholder="Filter items..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="text-xs pl-8"
					/>
				</div>
				<NavMain items={filteredItems} />
				{/* <NavProjects projects={data.projects} /> */}
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
