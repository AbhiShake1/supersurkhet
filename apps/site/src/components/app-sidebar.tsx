import type * as React from "react";

import { NavMain, type NavMainProps } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
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
	return (
		<Sidebar {...props}>
			{/* <SidebarHeader>
				<TeamSwitcher teams={data.teams} />
			</SidebarHeader> */}
			<SidebarContent>
				<NavMain items={data.items} />
				{/* <NavProjects projects={data.projects} /> */}
			</SidebarContent>
			<SidebarFooter>
				<NavUser />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
