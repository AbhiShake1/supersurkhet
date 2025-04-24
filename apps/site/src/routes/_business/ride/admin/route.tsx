import { AppSidebar, type SidebarItems } from "@/components/app-sidebar";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import {
	createFileRoute,
	Link,
	Outlet,
	useLocation,
} from "@tanstack/react-router";
import {
	BookOpen,
	Command,
	Frame,
	Map,
	PieChart,
	Settings2,
} from "lucide-react";

export const Route = createFileRoute("/_business/ride/admin")({
	component: RouteComponent,
});

const data: SidebarItems = {
	user: {
		name: "Admin",
		email: "admin@surkhetride.com",
		avatar: "/avatars/admin.jpg",
	},
	teams: [
		{
			name: "Active Drivers",
			logo: Map,
			plan: "45 Drivers",
		},
		{
			name: "Available Vehicles",
			logo: Command,
			plan: "32 Vehicles",
		},
		{
			name: "Today's Rides",
			logo: PieChart,
			plan: "128 Rides",
		},
	],
	navMain: [
		{
			title: "Dashboard",
			url: "/",
			icon: PieChart,
			isActive: true,
			items: [
				{
					title: "Overview",
					url: "/",
				},
				{
					title: "Analytics",
					url: "/",
				},
				{
					title: "Reports",
					url: "/",
				},
			],
		},
		{
			title: "Vehicle Management",
			url: "/",
			icon: Command,
			items: [
				{
					title: "Vehicle Types",
					url: "/ride/admin/vehicle-types",
				},
				{
					title: "Active Vehicles",
					url: "/",
				},
				{
					title: "Maintenance",
					url: "/",
				},
			],
		},
		{
			title: "Driver Management",
			url: "/",
			icon: Frame,
			items: [
				{
					title: "All Drivers",
					url: "/",
				},
				{
					title: "Verification",
					url: "/",
				},
				{
					title: "Performance",
					url: "/",
				},
			],
		},
		{
			title: "Settings",
			url: "/",
			icon: Settings2,
			items: [
				{
					title: "Service Settings",
					url: "/",
				},
				{
					title: "Pricing",
					url: "/",
				},
				{
					title: "Security",
					url: "/",
				},
			],
		},
	],
	projects: [
		{
			name: "Active Rides",
			url: "/",
			icon: Map,
			count: "12",
		},
		{
			name: "Pending Approvals",
			url: "/",
			icon: Frame,
			count: "5",
		},
		{
			name: "Support Tickets",
			url: "/",
			icon: BookOpen,
			count: "3",
		},
	],
};

function RouteComponent() {
	const { pathname: currentPathname } = useLocation();

	const [_, ...pathname] = currentPathname
		.split("/")
		.filter((i) => !!i.length)
		.map((p) => p);

	return (
		<SidebarProvider>
			<AppSidebar data={data} />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
					<div className="flex items-center gap-2 px-4">
						<SidebarTrigger className="-ml-1" />
						<Separator orientation="vertical" className="mr-2 h-4" />
						<Breadcrumb>
							<BreadcrumbList>
								{pathname.map((path, index) => (
									<>
										<BreadcrumbItem className="hidden md:block capitalize">
											<BreadcrumbLink asChild>
												<Link
													to={"/ride/" + pathname.slice(0, index + 1).join("/")}
												>
													{path.replaceAll("-", " ")}
												</Link>
											</BreadcrumbLink>
										</BreadcrumbItem>
										{index < pathname.length - 1 && (
											<BreadcrumbSeparator className="hidden md:block" />
										)}
									</>
								))}
							</BreadcrumbList>
						</Breadcrumb>
					</div>
				</header>
				<Outlet />
			</SidebarInset>
		</SidebarProvider>
	);
}
