'use client';

import { Link, useLocation } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

export interface NavMainProps {
  items: {
    title: string;
    icon?: LucideIcon;
  }[];
}

export function NavMain({ items }: NavMainProps) {
  const { search } = useLocation();
  const tab =
    typeof search?.tab === 'string' ? search.tab : (items[0]?.title ?? '');
  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <SidebarMenuItem key={item.title}>
            <SidebarMenuButton
              tooltip={item.title}
              className={cn(tab === item.title && 'bg-accent')}
              asChild
            >
              <Link to="." search={{ tab: item.title }}>
                {item.icon && <item.icon className={cn('w-4')} />}
                <span>{item.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
