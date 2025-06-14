import type { SchemaKeys } from "@gta/react-hooks";
import { AutoTable, type AutoTableProps } from "../auto-table";

import { AppSidebar, type SidebarItems } from "@/components/app-sidebar";
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from "@/components/ui/sidebar";
import { notFound, useLocation } from "@tanstack/react-router";
import {
    type LucideIcon
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export interface AutoAdminProps<T> {
    tabs: T
}

export type AutoTableKeys = {
    title: string;
    icon?: LucideIcon;
} & (
        Omit<AutoTableProps<SchemaKeys>, "slug">
        | {
            children: ReactNode,
        }
    )

export function AutoAdmin<const T extends AutoTableKeys[]>({ tabs }: AutoAdminProps<T>) {
    const data: SidebarItems = {
        user: {
            name: "Admin",
            email: "admin@surkhetride.com",
            avatar: "/avatars/admin.jpg",
        },
        items: tabs,
    };
    const { search, pathname: currentPathname } = useLocation()
    // @ts-expect-error
    const tab = search.tab as string ?? tabs[0].title;

    const currentItem = tabs.find(t => t.title === tab);
    
    if (!currentItem) {
        throw notFound()
    }

    const [basePath] = currentPathname
        .split("/")
        .filter((i) => !!i.length)

    return (
        <SidebarProvider>
            <AppSidebar data={data} />
            <SidebarInset>
                <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
                    <div className="flex items-center gap-2 px-4">
                        <SidebarTrigger className="-ml-1" />
                    </div>
                </header>
                <section className={cn(
                    "mx-6 items-start justify-center",
                    "max-w-[85%]"
                )}>
                    {
                        "children" in currentItem ? currentItem.children :
                            <AutoTable schema={currentItem.schema} slug={basePath} />
                    }
                </section>
            </SidebarInset>
        </SidebarProvider>
    );
}