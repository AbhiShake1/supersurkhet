import type * as React from "react";

import { NavMain, type NavMainProps } from "@/components/nav-main";
import { NavProjects, type NavProjectsProps } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import {
	TeamSwitcher,
	type TeamSwitcherProps,
} from "@/components/team-switcher";
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarRail,
} from "@/components/ui/sidebar";

export type SidebarItems = {
	user: {
		name: string;
		email: string;
		avatar: string;
	};
	teams: TeamSwitcherProps["teams"];
	navMain: NavMainProps["items"];
	projects: NavProjectsProps["projects"];
};

export function AppSidebar({
	data,
	...props
}: React.ComponentProps<typeof Sidebar> & { data: SidebarItems }) {
	return (
		<Sidebar collapsible="icon" {...props}>
			<SidebarHeader>
				<TeamSwitcher teams={data.teams} />
			</SidebarHeader>
			<SidebarContent>
				<NavMain items={data.navMain} />
				<NavProjects projects={data.projects} />
			</SidebarContent>
			<SidebarFooter>
				<NavUser user={data.user} />
			</SidebarFooter>
			<SidebarRail />
		</Sidebar>
	);
}
