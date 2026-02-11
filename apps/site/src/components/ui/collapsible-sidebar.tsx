import type React from 'react';
import { useState, useEffect } from 'react';
import {
  ChevronsRight,
  Search,
  Menu,
  ChevronsUpDown,
  LogOut,
  Settings,
} from 'lucide-react';
import { Link, useLocation } from '@tanstack/react-router';
import { Input } from './input';
import { useAuth } from '../auth-provider';
import type { LucideIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { useProfile } from '@/hooks/use-profile';
import { ManageOrganization } from './organizations/manage-organization';
import { ThemeToggle } from '../theme/theme-toggle';
import type { PossibleTabConfig } from '../auto-admin';
import { useDialog } from '@/contexts/dialog-context';
import { useIsMobile } from '@/hooks/use-mobile';
import isDeepEqual from 'fast-deep-equal';

export interface CollapsibleSidebarProps {
  businessName?: string;
  slug?: string;
  tabs: PossibleTabConfig[];
}

const CollapsibleSidebar: React.FC<CollapsibleSidebarProps> = ({
  businessName,
  slug,
  tabs,
}) => {
  'use memo';
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(!isMobile);
  const [selected, setSelected] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const { search } = useLocation();
  const currentTab =
    (search?.tab as string) ?? (tabs.length > 0 ? tabs[0].title : '');

  // Set initial selected tab based on URL or first item
  useEffect(() => {
    if (currentTab) {
      setSelected(currentTab);
    } else if (tabs.length > 0) {
      setSelected(tabs[0].title);
    }
  }, [currentTab, tabs]);

  // Filter items based on search query
  const filteredItems = searchQuery
    ? tabs.filter((item) => {
        try {
          const regex = new RegExp(searchQuery, 'i'); // case-insensitive search
          return regex.test(item.title);
        } catch (e) {
          // If the regex is invalid, fallback to simple string includes
          return item.title.toLowerCase().includes(searchQuery.toLowerCase());
        }
      })
    : tabs;

  // Group items by group property if available
  const groupedItems: { [key: string]: typeof tabs } = {};
  const ungroupedItems: typeof tabs = [];

  filteredItems.forEach((item) => {
    if (item.group) {
      if (!groupedItems[item.group]) {
        groupedItems[item.group] = [];
      }
      groupedItems[item.group].push(item);
    } else {
      ungroupedItems.push(item);
    }
  });

  return (
    <nav
      className={`sticky top-0 h-svh min-h-screen shrink-0 border-r transition-all duration-300 ease-in-out ${
        open ? 'w-48 sm:w-64' : 'w-10 sm:w-16'
      } border-gray-200 dark:border-gray-800 bg-card p-0.5 sm:p-2 shadow-sm z-50 flex flex-col`}
    >
      {/* User profile section at the top */}
      <div className="flex-shrink-0">
        <TitleSection
          open={open}
          businessName={businessName}
          slug={slug}
          tabs={tabs}
        />

        {/* Search bar */}
        {open && (
          <Input
            placeholder="Filter items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs pl-8 my-2"
            leadingIcon={<Search className="h-4 w-4 my-2" />}
          />
        )}
      </div>

      {/* Navigation items */}
      <div className="flex-grow overflow-y-auto pb-16">
        <div className="space-y-1">
          {ungroupedItems.map((item, index) => (
            <Option
              key={index}
              Icon={item.icon || Menu}
              title={item.title}
              url={item.url}
              selected={selected}
              setSelected={setSelected}
              open={open}
            />
          ))}
        </div>

        {/* Grouped navigation items */}
        {Object.entries(groupedItems).map(([groupName, items]) => (
          <div key={groupName} className="">
            {open && (
              <div className="px-3 py-2 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                {groupName}
              </div>
            )}
            <div className="space-y-1">
              {items.map((item, index) => (
                <Option
                  key={`${groupName}-${index}`}
                  Icon={item.icon || Menu}
                  title={item.title}
                  url={item.url}
                  selected={selected}
                  setSelected={setSelected}
                  open={open}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Toggle button at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-800">
        <ToggleClose open={open} setOpen={setOpen} />
      </div>
    </nav>
  );
};

const Option: React.FC<{
  Icon: LucideIcon;
  title: string;
  url: string;
  selected: string;
  setSelected: (title: string) => void;
  open: boolean;
}> = ({ Icon, title, selected, setSelected, open }) => {
  const isSelected = selected === title;

  const handleClick = () => {
    setSelected(title);
  };

  return (
    <Link
      onClick={handleClick}
      to="."
      search={{ tab: title }}
      className={`relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
        isSelected
          ? 'bg-primary/60 text-accent-foreground shadow-sm border-l-2 border-primary/50'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
      }`}
    >
      <div className="grid h-full w-10 sm:w-12 place-content-center">
        <Icon className="h-4 w-4" />
      </div>

      {open && (
        <span
          className={`text-sm font-medium transition-opacity duration-200 ${
            open ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {title}
        </span>
      )}
    </Link>
  );
};

const TitleSection: React.FC<{
  open: boolean;
  businessName?: string;
  slug?: string;
  tabs: PossibleTabConfig[];
}> = ({ open, businessName, slug, tabs }) => {
  const { openDialog } = useDialog();
  const { logout, isAuthenticated } = useAuth();
  const user = useProfile();

  if (!isAuthenticated) return null;

  return (
    <div className="border-b border-gray-200 dark:border-gray-800 pb-1 sm:pb-4">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <div
            className={`flex cursor-pointer items-center ${open ? 'justify-between' : 'justify-center'} rounded-md p-0.5 sm:p-2 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800`}
          >
            <div className="flex items-center gap-1 sm:gap-3">
              <div
                className={`flex items-center justify-center ${open ? 'w-auto' : 'w-full'}`}
              >
                <Avatar className="h-5 w-5 sm:h-8 sm:w-8">
                  <AvatarImage src={user?.avatar} alt={user?.name} />
                  <AvatarFallback className="capitalize text-[0.5rem] sm:text-sm">
                    {user?.email?.[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
              {open && (
                <div
                  className={`transition-opacity duration-200 ${open ? 'opacity-100' : 'opacity-0'}`}
                >
                  <div className="flex flex-col">
                    <span className="block max-w-[4ch] sm:max-w-[8ch] truncate text-[0.6rem] sm:text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {user?.name || user?.email || 'User'}
                    </span>
                    {businessName && (
                      <span className="block text-[0.5rem] sm:text-xs text-gray-500 dark:text-gray-400">
                        {businessName}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
            {open && (
              <ChevronsUpDown className="h-3 w-3 sm:h-4 sm:w-4 text-gray-400 dark:text-gray-500" />
            )}
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56 rounded-lg" side={'bottom'}>
          <DropdownMenuLabel className="p-0 font-normal">
            <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
              <Avatar className="h-8 w-8 rounded-lg">
                <AvatarImage src={user?.avatar} alt={user?.name} />
                <AvatarFallback className="rounded-lg">
                  {user?.name?.substring(0, 1)?.toUpperCase() ?? 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user?.name}</span>
                <span className="truncate text-xs">{user?.email}</span>
              </div>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuItem
            className="mb-4"
            onSelect={(e) => e.preventDefault()}
            asChild
          >
            <ThemeToggle />
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {slug && (
            <>
              <DropdownMenuItem
                className="gap-2"
                onSelect={(e) => {
                  e.preventDefault();
                  openDialog({
                    children: <ManageOrganization slug={slug} tabs={tabs} />,
                    className: 'sm:max-w-[70%] h-[80%] p-0 overflow-clip',
                  });
                }}
              >
                <Settings className="size-4" />
                Manage Business
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem className="gap-2" onClick={() => logout()}>
            <LogOut className="size-4" />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

const ToggleClose: React.FC<{
  open: boolean;
  setOpen: (open: boolean) => void;
}> = ({ open, setOpen }) => {
  return (
    <button
      onClick={() => setOpen(!open)}
      className="w-full border-t border-gray-200 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800 backdrop-blur-2xl"
    >
      <div className="flex items-center p-1 sm:p-3">
        <div className="grid size-6 sm:size-10 place-content-center">
          <ChevronsRight
            className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform duration-300 text-gray-500 dark:text-gray-400 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </div>
        {open && (
          <span
            className={`text-[0.6rem] sm:text-sm font-medium text-gray-600 dark:text-gray-300 transition-opacity duration-200 ${
              open ? 'opacity-100' : 'opacity-0'
            }`}
          >
            Hide
          </span>
        )}
      </div>
    </button>
  );
};

export default CollapsibleSidebar;
