import { Link, useLocation } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import {
  ChevronDown,
  ChevronRight,
  ChevronsRight,
  ChevronsUpDown,
  LogOut,
  LucideBriefcaseBusiness,
  Menu,
  PlugZapIcon,
  Search,
  Settings,
  Star,
} from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useDialog } from '@/contexts/dialog-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProfile } from '@/hooks/use-profile';
import { appSchema } from '@/lib/schema';
import { useAuth } from '../auth-provider';
import type { PossibleTabConfig } from '../auto-admin';
import { ThemeToggle } from '../theme/theme-toggle';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Input } from './input';
import { ManageOrganization } from './organizations/manage-organization';

function isLucideIcon(value: unknown): value is LucideIcon {
  return typeof value === 'function';
}

function getTabIcon(tab: PossibleTabConfig): LucideIcon {
  if ('icon' in tab && tab.icon) return tab.icon;
  if ('schema' in tab) {
    const schemaIcon = appSchema[tab.schema].icon;
    if (isLucideIcon(schemaIcon)) return schemaIcon;
    return LucideBriefcaseBusiness;
  }
  return Menu;
}

const FREQUENT_TABS_STORAGE_KEY = 'sidebar-frequent-tabs';
const GROUP_OPEN_STATE_STORAGE_KEY = 'sidebar-group-state';
const SECTION_TOGGLE_BUTTON_CLASS =
  'flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 active:bg-slate-200/60 dark:active:bg-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset';

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
  const [frequentUsage, setFrequentUsage] = useState<Record<string, number>>(
    {},
  );
  const [groupOpenState, setGroupOpenState] = useState<Record<string, boolean>>(
    {},
  );
  const [isFrequentOpen, setIsFrequentOpen] = useState(true);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawUsage = window.localStorage.getItem(FREQUENT_TABS_STORAGE_KEY);
      if (rawUsage) {
        const parsed = JSON.parse(rawUsage) as Record<string, number>;
        setFrequentUsage(parsed);
      }
      const rawGroups = window.localStorage.getItem(
        GROUP_OPEN_STATE_STORAGE_KEY,
      );
      if (rawGroups) {
        const parsed = JSON.parse(rawGroups) as Record<string, boolean>;
        setGroupOpenState(parsed);
      }
    } catch (_error) {
      setFrequentUsage({});
      setGroupOpenState({});
    }
  }, []);

  // Filter items based on search query
  const filteredItems = searchQuery
    ? tabs.filter((item) => {
        try {
          const regex = new RegExp(searchQuery, 'i'); // case-insensitive search
          return regex.test(item.title);
        } catch (_e) {
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

  const frequentItems = useMemo(() => {
    const byTitle = new Map(tabs.map((item) => [item.title, item]));
    return Object.entries(frequentUsage)
      .sort((a, b) => b[1] - a[1])
      .map(([title]) => byTitle.get(title))
      .filter((item): item is PossibleTabConfig => !!item)
      .slice(0, 5);
  }, [frequentUsage, tabs]);

  const frequentItemsBySearch = useMemo(() => {
    if (!searchQuery.trim()) return frequentItems;
    return frequentItems.filter((item) =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [frequentItems, searchQuery]);

  const toggleGroup = (groupName: string) => {
    setGroupOpenState((prev) => {
      const next = { ...prev, [groupName]: !(prev[groupName] ?? true) };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          GROUP_OPEN_STATE_STORAGE_KEY,
          JSON.stringify(next),
        );
      }
      return next;
    });
  };

  const incrementFrequentUsage = (title: string) => {
    setFrequentUsage((prev) => {
      const next = { ...prev, [title]: (prev[title] ?? 0) + 1 };
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(
          FREQUENT_TABS_STORAGE_KEY,
          JSON.stringify(next),
        );
      }
      return next;
    });
  };

  return (
    <nav
      className={`sticky top-0 h-svh min-h-screen shrink-0 border-r transition-all duration-300 ease-in-out ${
        open ? 'w-52 sm:w-72' : 'w-12 sm:w-16'
      } border-slate-200/80 dark:border-slate-800 bg-card/95 p-1.5 sm:p-2 shadow-sm z-50 flex flex-col`}
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
        {frequentItemsBySearch.length > 0 && (
          <div className="mb-2 rounded-lg border border-slate-200/80 bg-slate-50/40 p-1 dark:border-slate-800 dark:bg-slate-900/40">
            {open ? (
              <button
                type="button"
                onClick={() => setIsFrequentOpen((prev) => !prev)}
                aria-expanded={isFrequentOpen}
                className={SECTION_TOGGLE_BUTTON_CLASS}
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                <span className="inline-flex items-center gap-2">
                  <Star className="h-3.5 w-3.5" />
                  Frequently used
                </span>
                {isFrequentOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            ) : (
              <div className="grid place-content-center py-2 text-slate-500">
                <Star className="h-4 w-4" />
              </div>
            )}
            {(!open || isFrequentOpen) && (
              <div className="space-y-1 px-1 pb-1.5">
                {frequentItemsBySearch.map((item) => (
                  <Option
                    key={`frequent-${item.title}`}
                    Icon={getTabIcon(item)}
                    title={item.title}
                    url={item.url}
                    selected={selected}
                    setSelected={setSelected}
                    open={open}
                    onActivate={incrementFrequentUsage}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          {ungroupedItems.map((item, index) => (
            <Option
              // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
              key={index}
              Icon={getTabIcon(item)}
              title={item.title}
              url={item.url}
              selected={selected}
              setSelected={setSelected}
              open={open}
              onActivate={incrementFrequentUsage}
            />
          ))}
        </div>

        {/* Grouped navigation items */}
        {Object.entries(groupedItems).map(([groupName, items]) => {
          const isGroupOpen = groupOpenState[groupName] ?? true;
          return (
            <div
              key={groupName}
              className="mt-1 rounded-lg border border-slate-200/80 p-1 dark:border-slate-800"
            >
              {open ? (
                <button
                  type="button"
                  onClick={() => toggleGroup(groupName)}
                  aria-expanded={isGroupOpen}
                  className={SECTION_TOGGLE_BUTTON_CLASS}
                  style={{ WebkitTapHighlightColor: 'transparent' }}
                >
                  <span>{groupName}</span>
                  {isGroupOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </button>
              ) : null}
              {(isGroupOpen || !open) && (
                <div className="space-y-1 p-1">
                  {items.map((item, index) => (
                    <Option
                      key={`${groupName}-${
                        // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
                        index
                      }`}
                      Icon={getTabIcon(item)}
                      title={item.title}
                      url={item.url}
                      selected={selected}
                      setSelected={setSelected}
                      open={open}
                      onActivate={incrementFrequentUsage}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })}
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
  onActivate?: (title: string) => void;
}> = ({ Icon, title, selected, setSelected, open, onActivate }) => {
  const isSelected = selected === title;

  const handleClick = () => {
    setSelected(title);
    onActivate?.(title);
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
    <div className="border-b border-gray-200 dark:border-gray-800 pb-0 sm:pb-2">
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
          {slug && (
            <>
              <DropdownMenuItem asChild>
                <Link
                  to="/$businessName/admin/plugins"
                  params={{ businessName: slug }}
                  className="gap-1"
                >
                  <PlugZapIcon className="size-4" />
                  Manage Plugins
                </Link>
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
    // biome-ignore lint/a11y/useButtonType: lint debt cleanup
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
