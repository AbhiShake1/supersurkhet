import type * as React from "react";

import { NavMain, type NavMainProps } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarRail
} from "@/components/ui/sidebar";

export type SidebarItems = {
	user: {
		name: string;
		email: string;
		avatar: string;
	};
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
				<NavUser user={data.user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
