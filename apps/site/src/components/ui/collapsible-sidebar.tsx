import { Link, useLocation } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import {
  ArrowDownToLine,
  ArrowUpToLine,
  Boxes,
  ChevronDown,
  ChevronRight,
  ChevronsRight,
  ChevronsUpDown,
  LogOut,
  MoreHorizontal,
  Pencil,
  PlugZapIcon,
  Search,
  Settings,
  Star,
  Table2,
  Trash2,
  Workflow,
} from 'lucide-react';
import type React from 'react';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDialog } from '@/contexts/dialog-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { useProfile } from '@/hooks/use-profile';
import {
  loadSidebarPreferences,
  saveSidebarPreferences,
} from '@/lib/sidebar-preferences';
import { useAuth } from '../auth-provider';
import type { PossibleTabConfig } from '../auto-admin';
import { ThemeToggle } from '../theme/theme-toggle';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './alert-dialog';
import { Avatar, AvatarFallback, AvatarImage } from './avatar';
import { getTabIcon } from './collapsible-sidebar-icons';
import { commitSidebarRename } from './collapsible-sidebar-rename';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu';
import { Input } from './input';
import {
  ShortcutKbd,
  useRegisterShortcut,
  useShortcutAction,
} from './keyboard-shortcuts';
import { ManageOrganization } from './organizations/manage-organization';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from './popover';
import {
  Sortable,
  SortableContent,
  type SortableDragEndEvent,
  type SortableDragStartEvent,
  SortableItem,
  SortableItemHandle,
} from './sortable';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

const SECTION_TOGGLE_BUTTON_CLASS =
  'flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 active:bg-slate-200/60 dark:active:bg-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset';
const UNGROUP_DROP_SENTINEL = '__sidebar_ungroup_drop__';
const SIDEBAR_SHORTCUTS = {
  nextFocusable: {
    id: 'autoAdmin.nextSidebarItem',
    label: 'Next sidebar element',
    description: 'Move focus to the next actionable sidebar element.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'ArrowDown',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  previousFocusable: {
    id: 'autoAdmin.previousSidebarItem',
    label: 'Previous sidebar element',
    description: 'Move focus to the previous actionable sidebar element.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'ArrowUp',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  activateFocused: {
    id: 'autoAdmin.activateFocusedElement',
    label: 'Activate focused element',
    description: 'Click the currently focused sidebar element.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'Enter',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  focusSearch: {
    id: 'autoAdmin.focusSidebarSearch',
    label: 'Focus sidebar search',
    description: 'Focus sidebar search/filter field.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 's',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  openSidebar: {
    id: 'autoAdmin.openSidebar',
    label: 'Show sidebar',
    description: 'Ensure sidebar is visible.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: '1',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
  closeSidebar: {
    id: 'autoAdmin.closeSidebar',
    label: 'Hide sidebar',
    description: 'Collapse the sidebar.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: '2',
      ctrl: false,
      meta: true,
      alt: false,
      shift: false,
    },
  },
  openItemActions: {
    id: 'autoAdmin.openSidebarItemActions',
    label: 'Open sidebar item actions',
    description: 'Open actions for the focused sidebar item.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'a',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  renameItem: {
    id: 'autoAdmin.renameSidebarItem',
    label: 'Rename sidebar item',
    description: 'Start renaming the focused sidebar item.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'r',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  quickAddGroup: {
    id: 'autoAdmin.quickAddGroup',
    label: 'Quick add group',
    description: 'Create a new sidebar group.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'g',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  quickAddTable: {
    id: 'autoAdmin.quickAddTable',
    label: 'Quick add table',
    description: 'Create a new ungrouped table from the sidebar.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 't',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  toggleFrequentSection: {
    id: 'autoAdmin.toggleFrequentSection',
    label: 'Toggle frequently used section',
    description: 'Expand or collapse the frequently used sidebar section.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'f',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  toggleFocusedGroup: {
    id: 'autoAdmin.toggleFocusedGroup',
    label: 'Toggle focused group',
    description: 'Expand or collapse the currently focused group.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'h',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  openFocusedGroupActions: {
    id: 'autoAdmin.openFocusedGroupActions',
    label: 'Open focused group actions',
    description: 'Open the actions menu for the currently focused group.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'm',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  renameFocusedGroup: {
    id: 'autoAdmin.renameFocusedGroup',
    label: 'Rename focused group',
    description: 'Start renaming the currently focused group.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'r',
      ctrl: false,
      meta: false,
      alt: false,
      shift: true,
    },
  },
  reorderFocusedGroupHandle: {
    id: 'autoAdmin.reorderFocusedGroupHandle',
    label: 'Focused group reorder handle',
    description: 'Use the focused group reorder drag handle.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'd',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  openFocusedTab: {
    id: 'autoAdmin.openFocusedTab',
    label: 'Open focused tab',
    description: 'Open the currently focused sidebar tab.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'o',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  openFocusedTabIconPicker: {
    id: 'autoAdmin.openFocusedTabIconPicker',
    label: 'Open tab icon picker',
    description: 'Open icon picker for the currently focused tab.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'i',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  selectTabIconOption: {
    id: 'autoAdmin.selectTabIconOption',
    label: 'Select tab icon option',
    description: 'Select a focused icon option in the tab icon picker.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'Enter',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  openFocusedTabWorkflow: {
    id: 'autoAdmin.openFocusedTabWorkflow',
    label: 'Open focused tab workflow',
    description: 'Open workflow settings for the focused tab.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'w',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  deleteFocusedTabTable: {
    id: 'autoAdmin.deleteFocusedTabTable',
    label: 'Delete focused table',
    description: 'Trigger delete action for the focused sidebar table.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'Backspace',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  managePlugins: {
    id: 'autoAdmin.managePlugins',
    label: 'Open manage plugins',
    description: 'Open the manage plugins page for this business.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'p',
      ctrl: false,
      meta: false,
      alt: false,
      shift: false,
    },
  },
  groupActionRename: {
    id: 'autoAdmin.groupActionRename',
    label: 'Group action: Rename group',
    description: 'Rename group from the group actions popover.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'r',
      ctrl: false,
      meta: true,
      alt: true,
      shift: true,
    },
  },
  groupActionMoveUp: {
    id: 'autoAdmin.groupActionMoveUp',
    label: 'Group action: Move group up',
    description: 'Move group up from the group actions popover.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'ArrowUp',
      ctrl: false,
      meta: true,
      alt: true,
      shift: true,
    },
  },
  groupActionMoveDown: {
    id: 'autoAdmin.groupActionMoveDown',
    label: 'Group action: Move group down',
    description: 'Move group down from the group actions popover.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'ArrowDown',
      ctrl: false,
      meta: true,
      alt: true,
      shift: true,
    },
  },
  groupActionAddTable: {
    id: 'autoAdmin.groupActionAddTable',
    label: 'Group action: Add table',
    description: 'Add table from the group actions popover.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 't',
      ctrl: false,
      meta: true,
      alt: true,
      shift: true,
    },
  },
  groupActionAddGroup: {
    id: 'autoAdmin.groupActionAddGroup',
    label: 'Group action: Add group',
    description: 'Add group from the group actions popover.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'g',
      ctrl: false,
      meta: true,
      alt: true,
      shift: true,
    },
  },
  groupActionAddGroupAbove: {
    id: 'autoAdmin.groupActionAddGroupAbove',
    label: 'Group action: Add group above',
    description: 'Add a group above from the group actions popover.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: '[',
      ctrl: false,
      meta: true,
      alt: true,
      shift: true,
    },
  },
  groupActionAddGroupBelow: {
    id: 'autoAdmin.groupActionAddGroupBelow',
    label: 'Group action: Add group below',
    description: 'Add a group below from the group actions popover.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: ']',
      ctrl: false,
      meta: true,
      alt: true,
      shift: true,
    },
  },
  groupActionDelete: {
    id: 'autoAdmin.groupActionDelete',
    label: 'Group action: Delete group',
    description: 'Delete group from the group actions popover.',
    scope: 'AutoAdmin Sidebar',
    defaultBinding: {
      key: 'Backspace',
      ctrl: false,
      meta: true,
      alt: true,
      shift: true,
    },
  },
} as const;

function toReorderPosition(
  activeIndex: number,
  overIndex: number,
): 'above' | 'below' {
  return activeIndex > overIndex ? 'above' : 'below';
}

function getTabSortableValue(item: PossibleTabConfig): string {
  const explicitTabId =
    'tabId' in item &&
    typeof item.tabId === 'string' &&
    item.tabId.trim().length > 0
      ? item.tabId.trim()
      : null;
  if (explicitTabId) return `tab:${explicitTabId}`;
  if ('schema' in item && typeof item.schema === 'string') {
    return `schema:${item.schema}`;
  }
  return `title:${item.title}`;
}

type GroupAddOptions = {
  relativeTo?: string;
  position?: 'above' | 'below';
};

export interface CollapsibleSidebarProps {
  businessName?: string;
  slug?: string;
  tabs: PossibleTabConfig[];
  editable?: boolean;
  onAddTable?: (targetGroupName?: string) => void;
  onAddGroup?: (groupName?: string, options?: GroupAddOptions) => void;
  onReorderGroups?: (
    fromGroupName: string,
    toGroupName: string,
    position?: 'above' | 'below',
  ) => void;
  onReorderTabs?: (
    fromTabTitle: string,
    toTabTitle: string,
    position?: 'above' | 'below',
  ) => void;
  onMoveTabToGroup?: (tabTitle: string, groupName?: string) => void;
  onRenameGroup?: (previousGroupName: string, nextGroupName: string) => void;
  onDeleteGroup?: (groupName: string) => void;
  onRenameTab?: (previousTabTitle: string, nextTabTitle: string) => void;
  onRenameTabIcon?: (tabTitle: string, iconName: string) => void;
  onOpenWorkflowEditorForTab?: (tabTitle: string) => void;
  onDeleteTableForTab?: (tabTitle: string) => void;
  groups?: string[];
}

const CollapsibleSidebarInner: React.FC<CollapsibleSidebarProps> = ({
  businessName,
  slug,
  tabs,
  editable = false,
  onAddTable,
  onAddGroup,
  onReorderGroups,
  onMoveTabToGroup,
  onReorderTabs,
  onRenameGroup,
  onDeleteGroup,
  onRenameTab,
  onRenameTabIcon,
  onOpenWorkflowEditorForTab,
  onDeleteTableForTab,
  groups,
}) => {
  'use memo';
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(!isMobile);
  const [searchQuery, setSearchQuery] = useState('');
  const [frequentUsage, setFrequentUsage] = useState<Record<string, number>>(
    {},
  );
  const [groupOpenState, setGroupOpenState] = useState<Record<string, boolean>>(
    {},
  );
  const [isFrequentOpen, setIsFrequentOpen] = useState(true);
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [editingTabTitle, setEditingTabTitle] = useState<string | null>(null);
  const [pendingGroupDelete, setPendingGroupDelete] = useState<{
    name: string;
    itemCount: number;
  } | null>(null);
  const [activeDraggedTabId, setActiveDraggedTabId] = useState<string | null>(
    null,
  );
  const [focusedSidebarTitle, setFocusedSidebarTitle] = useState<string>('');
  const [focusedSidebarGroupName, setFocusedSidebarGroupName] =
    useState<string>('');
  const groupCardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const pointerPositionRef = useRef<{ x: number; y: number } | null>(null);
  const externalDropHandledRef = useRef(false);
  const tabRenameHandledByKeyRef = useRef(false);
  const groupRenameHandledByKeyRef = useRef(false);
  const navRef = useRef<HTMLElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const iconCatalog = useMemo(() => {
    const entries = Object.entries(
      LucideIcons.icons as Record<string, LucideIcon>,
    );
    return entries.sort(([left], [right]) => left.localeCompare(right));
  }, []);
  const { user, anonymousUserId } = useAuth();
  const preferenceOwnerId = user?.pub ?? anonymousUserId ?? null;

  const { search } = useLocation();
  const currentTab =
    (search?.tab as string) ?? (tabs.length > 0 ? tabs[0].title : '');

  useEffect(() => {
    let isCancelled = false;
    void loadSidebarPreferences(preferenceOwnerId).then((next) => {
      if (isCancelled) return;
      setFrequentUsage(next.frequentUsage);
      setGroupOpenState(next.groupOpenState);
    });
    return () => {
      isCancelled = true;
    };
  }, [preferenceOwnerId]);

  const { groupedItems, ungroupedItems } = useMemo(() => {
    const nextFilteredItems = searchQuery
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

    const nextGroupedItems: { [key: string]: typeof tabs } = {};
    const nextUngroupedItems: typeof tabs = [];

    nextFilteredItems.forEach((item) => {
      if (item.group) {
        if (!nextGroupedItems[item.group]) {
          nextGroupedItems[item.group] = [];
        }
        nextGroupedItems[item.group].push(item);
      } else {
        nextUngroupedItems.push(item);
      }
    });

    return {
      groupedItems: nextGroupedItems,
      ungroupedItems: nextUngroupedItems,
    };
  }, [searchQuery, tabs]);

  const frequentItems = useMemo(() => {
    const byTitle = new Map(tabs.map((item) => [item.title, item]));
    return Object.entries(frequentUsage)
      .sort((a, b) => b[1] - a[1])
      .map(([title]) => byTitle.get(title))
      .filter((item): item is PossibleTabConfig => !!item)
      .slice(0, 5);
  }, [frequentUsage, tabs]);

  const frequentItemsBySearch = useMemo(() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    return frequentItems.filter((item) => {
      const matchesSearch =
        !normalizedSearchQuery ||
        item.title.toLowerCase().includes(normalizedSearchQuery);
      return item.title !== currentTab && matchesSearch;
    });
  }, [currentTab, frequentItems, searchQuery]);

  const groupNamesToRender = useMemo(() => {
    const next = new Set<string>(groups ?? []);
    for (const key of Object.keys(groupedItems)) {
      if (key.trim()) next.add(key);
    }
    const baselineOrder = groups ?? [];
    const preferred = baselineOrder.filter((groupName) => next.has(groupName));
    for (const groupName of groups ?? []) {
      if (next.has(groupName) && !preferred.includes(groupName)) {
        preferred.push(groupName);
      }
    }
    const remaining = [...next].filter(
      (groupName) => !preferred.includes(groupName),
    );
    return [...preferred, ...remaining];
  }, [groupedItems, groups]);

  const previewGroupOrder = groupNamesToRender;
  const isSchemaBackedTab = useCallback(
    (title: string) => {
      const matchedItem = tabs.find((item) => item.title === title);
      if (!matchedItem) return false;
      return 'schema' in matchedItem || 'parsedSchema' in matchedItem;
    },
    [tabs],
  );
  const tabBySortableId = useMemo(() => {
    const map = new Map<string, PossibleTabConfig>();
    for (const tab of tabs) {
      map.set(getTabSortableValue(tab), tab);
    }
    return map;
  }, [tabs]);

  const toggleGroup = useCallback(
    (groupName: string) => {
      setGroupOpenState((prev) => {
        const next = { ...prev, [groupName]: !(prev[groupName] ?? true) };
        saveSidebarPreferences(preferenceOwnerId, {
          groupOpenState: next,
        });
        return next;
      });
    },
    [preferenceOwnerId],
  );

  const incrementFrequentUsage = useCallback(
    (title: string) => {
      setFrequentUsage((prev) => {
        const next = { ...prev, [title]: (prev[title] ?? 0) + 1 };
        saveSidebarPreferences(preferenceOwnerId, {
          frequentUsage: next,
        });
        return next;
      });
    },
    [preferenceOwnerId],
  );

  const commitTabRename = useCallback(
    (previousTitle: string, nextTitle: string) => {
      return commitSidebarRename({
        entity: 'tab',
        previousValue: previousTitle,
        nextValue: nextTitle,
        onRename: onRenameTab,
      });
    },
    [onRenameTab],
  );

  const beginTabRename = useCallback((title: string) => {
    tabRenameHandledByKeyRef.current = false;
    setEditingTabTitle(title);
  }, []);

  const commitGroupRename = useCallback(
    (previousGroupName: string, nextGroupName: string) => {
      return commitSidebarRename({
        entity: 'group',
        previousValue: previousGroupName,
        nextValue: nextGroupName,
        onRename: onRenameGroup,
      });
    },
    [onRenameGroup],
  );

  const beginGroupRename = useCallback((groupName: string) => {
    groupRenameHandledByKeyRef.current = false;
    setEditingGroupName(groupName);
  }, []);

  const requestDeleteGroup = useCallback(
    (groupName: string, itemCount: number) => {
      if (!onDeleteGroup) return;
      if (itemCount === 0) {
        onDeleteGroup(groupName);
        return;
      }
      setPendingGroupDelete({
        name: groupName,
        itemCount,
      });
    },
    [onDeleteGroup],
  );

  useEffect(() => {
    if (!activeDraggedTabId) return;
    const updatePointerPosition = (x: number, y: number) => {
      pointerPositionRef.current = {
        x,
        y,
      };
    };
    const handlePointerMove = (event: PointerEvent) => {
      updatePointerPosition(event.clientX, event.clientY);
    };
    const handleMouseMove = (event: MouseEvent) => {
      updatePointerPosition(event.clientX, event.clientY);
    };
    const handleTouchMove = (event: TouchEvent) => {
      const touch = event.touches[0];
      if (!touch) return;
      updatePointerPosition(touch.clientX, touch.clientY);
    };
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
    };
  }, [activeDraggedTabId]);

  const clearTrackedDragState = useCallback(() => {
    setActiveDraggedTabId(null);
    pointerPositionRef.current = null;
  }, []);

  const setGroupCardRef = useCallback(
    (groupName: string, element: HTMLDivElement | null) => {
      if (element) {
        groupCardRefs.current.set(groupName, element);
        return;
      }
      groupCardRefs.current.delete(groupName);
    },
    [],
  );

  const resolveDropGroupFromDragEvent = useCallback(
    (event: SortableDragEndEvent): string | null => {
      const activeId = String(event.active.id ?? '');
      const activeTab = activeId ? tabBySortableId.get(activeId) : undefined;
      const sourceGroupName = activeTab?.group?.trim() || undefined;
      const translatedRect = event.active.rect.current.translated;
      const initialRect = event.active.rect.current.initial;
      const fallbackDropPosition = translatedRect
        ? {
            x: translatedRect.left + translatedRect.width / 2,
            y: translatedRect.top + translatedRect.height / 2,
          }
        : initialRect
          ? {
              x: initialRect.left + initialRect.width / 2 + event.delta.x,
              y: initialRect.top + initialRect.height / 2 + event.delta.y,
            }
          : pointerPositionRef.current;
      const dropPosition = pointerPositionRef.current ?? fallbackDropPosition;
      if (!dropPosition) return null;

      const pointElements = document.elementsFromPoint(
        dropPosition.x,
        dropPosition.y,
      );
      if (
        pointElements.some((element) =>
          element.closest('[data-sidebar-ungroup-drop-zone]'),
        )
      ) {
        return UNGROUP_DROP_SENTINEL;
      }

      // Prefer pointer hit-testing over `event.over` because each group renders
      // in its own sortable context, so `over` can still point to source-group
      // items even when the pointer is above a different group card.
      const groupsFromPoint = pointElements
        .map((element) =>
          element
            .closest<HTMLElement>('[data-sidebar-group-card]')
            ?.getAttribute('data-sidebar-group-name'),
        )
        .filter((groupName): groupName is string => Boolean(groupName));
      const uniqueGroupsFromPoint = [...new Set(groupsFromPoint)];
      const preferredGroupFromPoint = uniqueGroupsFromPoint.find(
        (groupName) => groupName !== sourceGroupName,
      );
      if (preferredGroupFromPoint) return preferredGroupFromPoint;
      if (uniqueGroupsFromPoint[0]) return uniqueGroupsFromPoint[0];

      const groupBoundsMatches: Array<{ groupName: string; distance: number }> =
        [];
      for (const [groupName, groupCard] of groupCardRefs.current.entries()) {
        const rect = groupCard.getBoundingClientRect();
        const insideGroupCard =
          dropPosition.x >= rect.left &&
          dropPosition.x <= rect.right &&
          dropPosition.y >= rect.top &&
          dropPosition.y <= rect.bottom;
        if (!insideGroupCard) continue;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const distance = Math.hypot(
          dropPosition.x - centerX,
          dropPosition.y - centerY,
        );
        groupBoundsMatches.push({ groupName, distance });
      }
      if (groupBoundsMatches.length > 0) {
        const sortedByDistance = groupBoundsMatches.sort(
          (left, right) => left.distance - right.distance,
        );
        const preferredGroupFromBounds = sortedByDistance.find(
          (candidate) => candidate.groupName !== sourceGroupName,
        );
        if (preferredGroupFromBounds) return preferredGroupFromBounds.groupName;
        return sortedByDistance[0]?.groupName ?? null;
      }

      const overId = event.over ? String(event.over.id) : '';
      if (overId) {
        const overTab = tabBySortableId.get(overId);
        if (overTab) {
          return overTab.group?.trim() || UNGROUP_DROP_SENTINEL;
        }
        if (groupCardRefs.current.has(overId)) {
          return overId;
        }
      }

      return null;
    },
    [tabBySortableId],
  );

  const handleTabDragStart = useCallback(
    ({ active }: SortableDragStartEvent) => {
      setActiveDraggedTabId(String(active.id ?? ''));
      pointerPositionRef.current = null;
      externalDropHandledRef.current = false;
    },
    [],
  );

  const handleTabDragEnd = useCallback(
    (event: SortableDragEndEvent) => {
      const activeId = String(event.active.id ?? '');
      if (!activeId) {
        clearTrackedDragState();
        return;
      }

      if (!onMoveTabToGroup) {
        clearTrackedDragState();
        return;
      }

      const resolvedDropGroup = resolveDropGroupFromDragEvent(event);
      if (resolvedDropGroup === null) {
        clearTrackedDragState();
        return;
      }
      const targetGroupName =
        resolvedDropGroup === UNGROUP_DROP_SENTINEL
          ? undefined
          : resolvedDropGroup;

      const sourceTab = tabBySortableId.get(activeId);
      const sourceTabTitle = sourceTab?.title?.trim();
      const sourceGroupName = sourceTab?.group?.trim();
      if (sourceTabTitle && sourceGroupName !== targetGroupName) {
        externalDropHandledRef.current = true;
        queueMicrotask(() => {
          externalDropHandledRef.current = false;
        });
        onMoveTabToGroup(sourceTabTitle, targetGroupName);
      }
      clearTrackedDragState();
    },
    [
      clearTrackedDragState,
      onMoveTabToGroup,
      resolveDropGroupFromDragEvent,
      tabBySortableId,
    ],
  );

  const getVisibleSidebarFocusables = useCallback((): HTMLElement[] => {
    const root = navRef.current;
    if (!root) return [];
    const items = [...root.querySelectorAll<HTMLElement>('button, a[href]')];
    return items.filter(
      (item) =>
        item.offsetParent !== null &&
        item.getAttribute('aria-hidden') !== 'true' &&
        !item.hasAttribute('disabled') &&
        item.getAttribute('aria-disabled') !== 'true',
    );
  }, []);

  const getFocusedSidebarTitle = useCallback(() => {
    const active = document.activeElement as HTMLElement | null;
    const activeTitle = active?.getAttribute('data-sidebar-item-title');
    if (activeTitle) return activeTitle;
    if (focusedSidebarTitle) return focusedSidebarTitle;
    return currentTab;
  }, [currentTab, focusedSidebarTitle]);
  const getFocusedSidebarGroupName = useCallback(() => {
    const active = document.activeElement as HTMLElement | null;
    const activeGroupName = active?.getAttribute('data-sidebar-group-name');
    if (activeGroupName) return activeGroupName;
    return focusedSidebarGroupName;
  }, [focusedSidebarGroupName]);

  const focusSidebarElementByOffset = useCallback(
    (offset: number) => {
      const items = getVisibleSidebarFocusables();
      if (!items.length) return;
      const activeElement = document.activeElement as HTMLElement | null;
      const currentIndex = items.indexOf(activeElement);
      const resolvedIndex =
        currentIndex >= 0
          ? (currentIndex + offset + items.length) % items.length
          : offset > 0
            ? 0
            : items.length - 1;
      const nextItem = items[resolvedIndex];
      nextItem?.focus();
      const nextTitle = nextItem?.getAttribute('data-sidebar-item-title');
      if (nextTitle) setFocusedSidebarTitle(nextTitle);
    },
    [getVisibleSidebarFocusables],
  );

  const isSidebarShortcutTarget = useCallback((event: KeyboardEvent) => {
    if (!navRef.current) return false;
    const target = event.target as Node | null;
    if (!target) return false;
    const active = document.activeElement as Node | null;
    return (
      navRef.current.contains(target) ||
      (active ? navRef.current.contains(active) : false)
    );
  }, []);
  const isPlainArrowSidebarNavigationTarget = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey) return false;
      if (!navRef.current) return false;
      const active = document.activeElement as HTMLElement | null;
      if (!active) return false;
      const editable =
        active.isContentEditable ||
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement;
      if (editable) return false;
      return navRef.current.contains(active);
    },
    [],
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
      if (!isPlainArrowSidebarNavigationTarget(event)) return;
      event.preventDefault();
      focusSidebarElementByOffset(event.key === 'ArrowDown' ? 1 : -1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [focusSidebarElementByOffset, isPlainArrowSidebarNavigationTarget]);
  useRegisterShortcut(SIDEBAR_SHORTCUTS.reorderFocusedGroupHandle);

  useShortcutAction(
    SIDEBAR_SHORTCUTS.nextFocusable,
    () => {
      focusSidebarElementByOffset(1);
    },
    { guard: isSidebarShortcutTarget },
  );
  useShortcutAction(
    SIDEBAR_SHORTCUTS.previousFocusable,
    () => {
      focusSidebarElementByOffset(-1);
    },
    { guard: isSidebarShortcutTarget },
  );
  useShortcutAction(
    SIDEBAR_SHORTCUTS.activateFocused,
    () => {
      const active = document.activeElement as HTMLElement | null;
      if (!active || !navRef.current?.contains(active)) return;
      active.click();
    },
    { guard: isSidebarShortcutTarget },
  );
  useShortcutAction(SIDEBAR_SHORTCUTS.focusSearch, () => {
    if (!open) return;
    searchInputRef.current?.focus();
  });
  useShortcutAction(SIDEBAR_SHORTCUTS.openSidebar, () => {
    setOpen(true);
  });
  useShortcutAction(SIDEBAR_SHORTCUTS.closeSidebar, () => {
    setOpen(false);
  });
  useShortcutAction(
    SIDEBAR_SHORTCUTS.openItemActions,
    () => {
      const title = getFocusedSidebarTitle();
      if (!title) return;
      const trigger = navRef.current?.querySelector<HTMLButtonElement>(
        `[data-sidebar-item-actions="${CSS.escape(title)}"]`,
      );
      trigger?.click();
    },
    { guard: isSidebarShortcutTarget },
  );
  useShortcutAction(
    SIDEBAR_SHORTCUTS.renameItem,
    () => {
      if (!editable) return;
      const title = getFocusedSidebarTitle();
      if (!title) return;
      beginTabRename(title);
    },
    { guard: isSidebarShortcutTarget },
  );
  useShortcutAction(
    SIDEBAR_SHORTCUTS.quickAddGroup,
    () => {
      if (!editable || !onAddGroup) return;
      onAddGroup();
    },
    {
      enabled: editable && Boolean(onAddGroup),
      guard: isSidebarShortcutTarget,
    },
  );
  useShortcutAction(
    SIDEBAR_SHORTCUTS.quickAddTable,
    () => {
      if (!editable || !onAddTable) return;
      onAddTable();
    },
    {
      enabled: editable && Boolean(onAddTable),
      guard: isSidebarShortcutTarget,
    },
  );
  useShortcutAction(
    SIDEBAR_SHORTCUTS.toggleFrequentSection,
    () => {
      if (!frequentItemsBySearch.length) return;
      setIsFrequentOpen((prev) => !prev);
    },
    {
      enabled: frequentItemsBySearch.length > 0,
      guard: isSidebarShortcutTarget,
    },
  );
  useShortcutAction(
    SIDEBAR_SHORTCUTS.toggleFocusedGroup,
    () => {
      const groupName = getFocusedSidebarGroupName();
      if (!groupName) return;
      toggleGroup(groupName);
    },
    { guard: isSidebarShortcutTarget },
  );
  useShortcutAction(
    SIDEBAR_SHORTCUTS.openFocusedGroupActions,
    () => {
      const groupName = getFocusedSidebarGroupName();
      if (!groupName) return;
      const trigger = navRef.current?.querySelector<HTMLButtonElement>(
        `[data-sidebar-group-actions="${CSS.escape(groupName)}"]`,
      );
      trigger?.click();
    },
    { guard: isSidebarShortcutTarget },
  );
  useShortcutAction(
    SIDEBAR_SHORTCUTS.renameFocusedGroup,
    () => {
      if (!editable || !onRenameGroup) return;
      const groupName = getFocusedSidebarGroupName();
      if (!groupName) return;
      beginGroupRename(groupName);
    },
    {
      enabled: editable && Boolean(onRenameGroup),
      guard: isSidebarShortcutTarget,
    },
  );
  useShortcutAction(
    SIDEBAR_SHORTCUTS.openFocusedTab,
    () => {
      const title = getFocusedSidebarTitle();
      if (!title) return;
      const tabLink = navRef.current?.querySelector<HTMLElement>(
        `[data-sidebar-item-link-title="${CSS.escape(title)}"]`,
      );
      tabLink?.click();
    },
    { guard: isSidebarShortcutTarget },
  );
  useShortcutAction(
    SIDEBAR_SHORTCUTS.openFocusedTabIconPicker,
    () => {
      if (!editable || !onRenameTabIcon) return;
      const title = getFocusedSidebarTitle();
      if (!title) return;
      const trigger = navRef.current?.querySelector<HTMLButtonElement>(
        `[data-sidebar-item-icon-trigger="${CSS.escape(title)}"]`,
      );
      trigger?.click();
    },
    {
      enabled: editable && Boolean(onRenameTabIcon),
      guard: isSidebarShortcutTarget,
    },
  );
  useShortcutAction(
    SIDEBAR_SHORTCUTS.openFocusedTabWorkflow,
    () => {
      if (!editable || !onOpenWorkflowEditorForTab) return;
      const title = getFocusedSidebarTitle();
      if (!title) return;
      if (!isSchemaBackedTab(title)) return;
      onOpenWorkflowEditorForTab(title);
    },
    {
      enabled: editable && Boolean(onOpenWorkflowEditorForTab),
      guard: isSidebarShortcutTarget,
    },
  );
  useShortcutAction(
    SIDEBAR_SHORTCUTS.deleteFocusedTabTable,
    () => {
      if (!editable || !onDeleteTableForTab) return;
      const title = getFocusedSidebarTitle();
      if (!title) return;
      if (!isSchemaBackedTab(title)) return;
      onDeleteTableForTab(title);
    },
    {
      enabled: editable && Boolean(onDeleteTableForTab),
      guard: isSidebarShortcutTarget,
    },
  );
  useShortcutAction(
    SIDEBAR_SHORTCUTS.managePlugins,
    () => {
      if (!slug) return;
      const link = navRef.current?.querySelector<HTMLElement>(
        '[data-sidebar-manage-plugins-link="true"]',
      );
      link?.click();
    },
    {
      enabled: Boolean(slug),
      guard: isSidebarShortcutTarget,
    },
  );

  return (
    <nav
      ref={navRef}
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
          <div className="relative">
            <Input
              ref={searchInputRef}
              data-auto-admin-sidebar-search="true"
              placeholder="Filter items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-28 my-2"
              leadingIcon={<Search className="h-4 w-4 my-2" />}
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2">
              <span className="inline-flex items-center gap-1">
                <ShortcutKbd
                  actionId={SIDEBAR_SHORTCUTS.focusSearch.id}
                  defaultBinding={SIDEBAR_SHORTCUTS.focusSearch.defaultBinding}
                  interactive={false}
                />
              </span>
            </span>
          </div>
        )}
      </div>

      {/* Navigation items */}
      <div className="flex-grow overflow-y-auto pb-16">
        {editable && (onAddGroup || onAddTable) ? (
          <div
            data-sidebar-ungroup-drop-zone="true"
            className={`mb-2 rounded-lg border p-1 transition-colors ${
              activeDraggedTabId
                ? 'border-primary/60 bg-primary/10 ring-1 ring-primary/40'
                : 'border-slate-200/80 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/40'
            }`}
          >
            {open ? (
              <div className="space-y-1">
                <div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  {activeDraggedTabId ? 'Drop zone' : 'Quick add'}
                </div>
                {activeDraggedTabId ? (
                  <div className="rounded-md border border-dashed border-primary/50 bg-background/70 px-2 py-1.5 text-xs text-primary">
                    Drag here to ungroup
                  </div>
                ) : null}
                {onAddGroup ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                        onClick={() => {
                          onAddGroup();
                        }}
                      >
                        <Boxes className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="flex-1">Add Group</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="flex items-center gap-2"
                    >
                      <span>Add group</span>
                      <ShortcutKbd
                        actionId={SIDEBAR_SHORTCUTS.quickAddGroup.id}
                        defaultBinding={
                          SIDEBAR_SHORTCUTS.quickAddGroup.defaultBinding
                        }
                        interactive={false}
                      />
                    </TooltipContent>
                  </Tooltip>
                ) : null}
                {onAddTable ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
                        onClick={() => {
                          onAddTable();
                        }}
                      >
                        <Table2 className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="flex-1">Add Table (Ungrouped)</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="flex items-center gap-2"
                    >
                      <span>Add ungrouped table</span>
                      <ShortcutKbd
                        actionId={SIDEBAR_SHORTCUTS.quickAddTable.id}
                        defaultBinding={
                          SIDEBAR_SHORTCUTS.quickAddTable.defaultBinding
                        }
                        interactive={false}
                      />
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
            ) : (
              <div className="grid gap-1">
                {onAddGroup ? (
                  <button
                    type="button"
                    className="grid place-content-center rounded-md p-1.5 text-slate-500 hover:bg-muted hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    onClick={() => {
                      onAddGroup();
                    }}
                    aria-label="Add Group"
                    title="Add Group"
                  >
                    <Boxes className="h-4 w-4" />
                  </button>
                ) : null}
                {onAddTable ? (
                  <button
                    type="button"
                    className="grid place-content-center rounded-md p-1.5 text-slate-500 hover:bg-muted hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    onClick={() => {
                      onAddTable();
                    }}
                    aria-label="Add Ungrouped Table"
                    title="Add Ungrouped Table"
                  >
                    <Table2 className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : null}

        {frequentItemsBySearch.length > 0 && (
          <div className="mb-2 rounded-lg border border-slate-200/80 bg-slate-50/40 p-1 dark:border-slate-800 dark:bg-slate-900/40">
            {open ? (
              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="flex items-center gap-2"
                >
                  <span>Toggle frequent section</span>
                  <ShortcutKbd
                    actionId={SIDEBAR_SHORTCUTS.toggleFrequentSection.id}
                    defaultBinding={
                      SIDEBAR_SHORTCUTS.toggleFrequentSection.defaultBinding
                    }
                    interactive={false}
                  />
                </TooltipContent>
              </Tooltip>
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
                    selected={currentTab}
                    open={open}
                    onActivate={incrementFrequentUsage}
                    onFocusItem={(title) => {
                      setFocusedSidebarTitle(title);
                      setFocusedSidebarGroupName('');
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <Sortable
            value={ungroupedItems}
            getItemValue={getTabSortableValue}
            orientation="vertical"
            confineToParent={false}
            onDragStart={handleTabDragStart}
            onDragCancel={clearTrackedDragState}
            onDragEnd={handleTabDragEnd}
            onMove={({ active, over, activeIndex, overIndex }) => {
              if (externalDropHandledRef.current) return;
              if (!editable || !onReorderTabs || !over) return;
              const sourceTab = ungroupedItems.find(
                (item) => getTabSortableValue(item) === String(active.id),
              );
              const targetTab = ungroupedItems.find(
                (item) => getTabSortableValue(item) === String(over.id),
              );
              const sourceTabTitle = sourceTab?.title?.trim();
              const targetTabTitle = targetTab?.title?.trim();
              if (!sourceTabTitle || !targetTabTitle) return;
              if (sourceTabTitle === targetTabTitle) return;
              if (activeIndex === overIndex) return;
              onReorderTabs(
                sourceTabTitle,
                targetTabTitle,
                toReorderPosition(activeIndex, overIndex),
              );
            }}
          >
            <SortableContent asChild>
              <div className="space-y-1">
                {ungroupedItems.map((item) => (
                  <SortableItem
                    key={item.title}
                    value={getTabSortableValue(item)}
                    asHandle
                    asChild
                  >
                    <div className="rounded-md">
                      {editingTabTitle === item.title ? (
                        <Input
                          autoFocus
                          defaultValue={item.title}
                          className="h-8 text-xs"
                          onBlur={(event) => {
                            if (tabRenameHandledByKeyRef.current) {
                              tabRenameHandledByKeyRef.current = false;
                            } else {
                              commitTabRename(
                                item.title,
                                event.currentTarget.value,
                              );
                            }
                            setEditingTabTitle(null);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault();
                              tabRenameHandledByKeyRef.current = true;
                              commitTabRename(
                                item.title,
                                event.currentTarget.value,
                              );
                              setEditingTabTitle(null);
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault();
                              tabRenameHandledByKeyRef.current = true;
                              setEditingTabTitle(null);
                            }
                          }}
                        />
                      ) : (
                        <Option
                          Icon={getTabIcon(item)}
                          iconName={item.iconName}
                          iconCatalog={iconCatalog}
                          title={item.title}
                          url={item.url}
                          selected={currentTab}
                          open={open}
                          editable={editable}
                          onBeginRename={editable ? beginTabRename : undefined}
                          onRenameIcon={onRenameTabIcon}
                          onOpenWorkflowEditor={
                            editable &&
                            onOpenWorkflowEditorForTab &&
                            ('schema' in item || 'parsedSchema' in item)
                              ? onOpenWorkflowEditorForTab
                              : undefined
                          }
                          onRequestDeleteTable={
                            editable &&
                            onDeleteTableForTab &&
                            ('schema' in item || 'parsedSchema' in item)
                              ? onDeleteTableForTab
                              : undefined
                          }
                          onActivate={incrementFrequentUsage}
                          onFocusItem={(title) => {
                            setFocusedSidebarTitle(title);
                            setFocusedSidebarGroupName('');
                          }}
                        />
                      )}
                    </div>
                  </SortableItem>
                ))}
              </div>
            </SortableContent>
          </Sortable>
        </div>

        {/* Grouped navigation items */}
        <Sortable
          value={previewGroupOrder}
          getItemValue={(groupName) => groupName}
          orientation="vertical"
          onMove={({ active, over, activeIndex, overIndex }) => {
            if (!editable || !onReorderGroups || !over) return;
            const fromGroupName = String(active.id);
            const toGroupName = String(over.id);
            if (!fromGroupName || !toGroupName) return;
            if (fromGroupName === toGroupName) return;
            if (activeIndex === overIndex) return;
            onReorderGroups(
              fromGroupName,
              toGroupName,
              toReorderPosition(activeIndex, overIndex),
            );
          }}
        >
          <SortableContent asChild>
            <div className="space-y-2 py-1">
              {previewGroupOrder.map((groupName, groupIndex) => {
                const items = groupedItems[groupName] ?? [];
                const isGroupOpen = groupOpenState[groupName] ?? true;
                const canMoveGroupUp = groupIndex > 0;
                const canMoveGroupDown =
                  groupIndex < previewGroupOrder.length - 1;
                return (
                  <SortableItem
                    key={groupName}
                    value={groupName}
                    asHandle={!open}
                    asChild
                  >
                    <div
                      ref={(element) => {
                        setGroupCardRef(groupName, element);
                      }}
                      onFocusCapture={() => {
                        setFocusedSidebarGroupName(groupName);
                        setFocusedSidebarTitle('');
                      }}
                      data-sidebar-group-card="true"
                      data-sidebar-group-name={groupName}
                      className="relative rounded-lg border border-slate-200/80 p-1 dark:border-slate-800"
                    >
                      {open ? (
                        editingGroupName === groupName ? (
                          <Input
                            autoFocus
                            defaultValue={groupName}
                            className="h-8 text-xs"
                            onBlur={(event) => {
                              if (groupRenameHandledByKeyRef.current) {
                                groupRenameHandledByKeyRef.current = false;
                              } else {
                                commitGroupRename(
                                  groupName,
                                  event.currentTarget.value,
                                );
                              }
                              setEditingGroupName(null);
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault();
                                groupRenameHandledByKeyRef.current = true;
                                commitGroupRename(
                                  groupName,
                                  event.currentTarget.value,
                                );
                                setEditingGroupName(null);
                              }
                              if (event.key === 'Escape') {
                                event.preventDefault();
                                groupRenameHandledByKeyRef.current = true;
                                setEditingGroupName(null);
                              }
                            }}
                          />
                        ) : (
                          <div className="group/group-header flex items-center gap-1">
                            {editable && onReorderGroups ? (
                              <SortableItemHandle asChild>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                      data-sidebar-group-name={groupName}
                                      aria-label={`Reorder group ${groupName}`}
                                      title={`Reorder group ${groupName}`}
                                    >
                                      <ChevronsUpDown className="h-4 w-4" />
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="right"
                                    className="flex items-center gap-2"
                                  >
                                    <span>Reorder group</span>
                                    <ShortcutKbd
                                      actionId={
                                        SIDEBAR_SHORTCUTS
                                          .reorderFocusedGroupHandle.id
                                      }
                                      defaultBinding={
                                        SIDEBAR_SHORTCUTS
                                          .reorderFocusedGroupHandle
                                          .defaultBinding
                                      }
                                      interactive={false}
                                    />
                                  </TooltipContent>
                                </Tooltip>
                              </SortableItemHandle>
                            ) : null}
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => toggleGroup(groupName)}
                                  aria-expanded={isGroupOpen}
                                  data-sidebar-group-toggle={groupName}
                                  data-sidebar-group-name={groupName}
                                  className={`${SECTION_TOGGLE_BUTTON_CLASS} flex-1`}
                                  style={{
                                    WebkitTapHighlightColor: 'transparent',
                                  }}
                                >
                                  <span>{groupName}</span>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent
                                side="right"
                                className="flex items-center gap-2"
                              >
                                <span>Toggle group</span>
                                <ShortcutKbd
                                  actionId={
                                    SIDEBAR_SHORTCUTS.toggleFocusedGroup.id
                                  }
                                  defaultBinding={
                                    SIDEBAR_SHORTCUTS.toggleFocusedGroup
                                      .defaultBinding
                                  }
                                  interactive={false}
                                />
                              </TooltipContent>
                            </Tooltip>
                            {editable && onRenameGroup ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    type="button"
                                    className="rounded p-1 text-slate-500 opacity-100 transition-opacity md:opacity-0 hover:bg-slate-100 hover:text-slate-800 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group-focus-within/group-header:opacity-100 group-hover/group-header:opacity-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                                    onClick={(event) => {
                                      event.preventDefault();
                                      event.stopPropagation();
                                      beginGroupRename(groupName);
                                    }}
                                    data-sidebar-group-name={groupName}
                                    aria-label={`Rename group ${groupName}`}
                                    title={`Rename group ${groupName}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent
                                  side="right"
                                  className="flex items-center gap-2"
                                >
                                  <span>Rename group</span>
                                  <ShortcutKbd
                                    actionId={
                                      SIDEBAR_SHORTCUTS.renameFocusedGroup.id
                                    }
                                    defaultBinding={
                                      SIDEBAR_SHORTCUTS.renameFocusedGroup
                                        .defaultBinding
                                    }
                                    interactive={false}
                                  />
                                </TooltipContent>
                              </Tooltip>
                            ) : null}
                            <GroupActionsPopover
                              editable={editable}
                              groupName={groupName}
                              itemCount={items.length}
                              canMoveUp={canMoveGroupUp}
                              canMoveDown={canMoveGroupDown}
                              onBeginRenameGroup={
                                onRenameGroup ? beginGroupRename : undefined
                              }
                              onMoveGroupUp={
                                canMoveGroupUp && onReorderGroups
                                  ? () => {
                                      const previousGroupName =
                                        previewGroupOrder[groupIndex - 1];
                                      if (!previousGroupName) return;
                                      onReorderGroups(
                                        groupName,
                                        previousGroupName,
                                        'above',
                                      );
                                    }
                                  : undefined
                              }
                              onMoveGroupDown={
                                canMoveGroupDown && onReorderGroups
                                  ? () => {
                                      const nextGroupName =
                                        previewGroupOrder[groupIndex + 1];
                                      if (!nextGroupName) return;
                                      onReorderGroups(
                                        groupName,
                                        nextGroupName,
                                        'below',
                                      );
                                    }
                                  : undefined
                              }
                              onRequestDeleteGroup={requestDeleteGroup}
                              onDeleteGroup={onDeleteGroup}
                              onAddGroup={onAddGroup}
                              onAddTable={onAddTable}
                            />
                            <button
                              type="button"
                              onClick={() => toggleGroup(groupName)}
                              aria-expanded={isGroupOpen}
                              data-sidebar-group-toggle={groupName}
                              data-sidebar-group-name={groupName}
                              aria-label={
                                isGroupOpen
                                  ? `Collapse group ${groupName}`
                                  : `Expand group ${groupName}`
                              }
                              className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                              style={{
                                WebkitTapHighlightColor: 'transparent',
                              }}
                            >
                              {isGroupOpen ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        )
                      ) : null}
                      {(isGroupOpen || !open) && (
                        <Sortable
                          value={items}
                          getItemValue={getTabSortableValue}
                          orientation="vertical"
                          confineToParent={false}
                          onDragStart={handleTabDragStart}
                          onDragCancel={clearTrackedDragState}
                          onDragEnd={handleTabDragEnd}
                          onMove={({
                            active,
                            over,
                            activeIndex,
                            overIndex,
                          }) => {
                            if (externalDropHandledRef.current) return;
                            if (!editable || !onReorderTabs || !over) return;
                            const sourceTab = items.find(
                              (item) =>
                                getTabSortableValue(item) === String(active.id),
                            );
                            const targetTab = items.find(
                              (item) =>
                                getTabSortableValue(item) === String(over.id),
                            );
                            const sourceTabTitle = sourceTab?.title?.trim();
                            const targetTabTitle = targetTab?.title?.trim();
                            if (!sourceTabTitle || !targetTabTitle) return;
                            if (sourceTabTitle === targetTabTitle) return;
                            if (activeIndex === overIndex) return;
                            onReorderTabs(
                              sourceTabTitle,
                              targetTabTitle,
                              toReorderPosition(activeIndex, overIndex),
                            );
                          }}
                        >
                          <SortableContent asChild>
                            <div className="space-y-1 p-1">
                              {items.map((item) => (
                                <SortableItem
                                  key={`${groupName}-${item.title}`}
                                  value={getTabSortableValue(item)}
                                  asHandle
                                  asChild
                                >
                                  <div className="rounded-md">
                                    {editingTabTitle === item.title ? (
                                      <Input
                                        autoFocus
                                        defaultValue={item.title}
                                        className="h-8 text-xs"
                                        onBlur={(event) => {
                                          if (
                                            tabRenameHandledByKeyRef.current
                                          ) {
                                            tabRenameHandledByKeyRef.current = false;
                                          } else {
                                            commitTabRename(
                                              item.title,
                                              event.currentTarget.value,
                                            );
                                          }
                                          setEditingTabTitle(null);
                                        }}
                                        onKeyDown={(event) => {
                                          if (event.key === 'Enter') {
                                            event.preventDefault();
                                            tabRenameHandledByKeyRef.current = true;
                                            commitTabRename(
                                              item.title,
                                              event.currentTarget.value,
                                            );
                                            setEditingTabTitle(null);
                                          }
                                          if (event.key === 'Escape') {
                                            event.preventDefault();
                                            tabRenameHandledByKeyRef.current = true;
                                            setEditingTabTitle(null);
                                          }
                                        }}
                                      />
                                    ) : (
                                      <Option
                                        Icon={getTabIcon(item)}
                                        iconName={item.iconName}
                                        iconCatalog={iconCatalog}
                                        title={item.title}
                                        url={item.url}
                                        selected={currentTab}
                                        open={open}
                                        editable={editable}
                                        onBeginRename={
                                          editable ? beginTabRename : undefined
                                        }
                                        onRenameIcon={onRenameTabIcon}
                                        onOpenWorkflowEditor={
                                          editable &&
                                          onOpenWorkflowEditorForTab &&
                                          ('schema' in item ||
                                            'parsedSchema' in item)
                                            ? onOpenWorkflowEditorForTab
                                            : undefined
                                        }
                                        onRequestDeleteTable={
                                          editable &&
                                          onDeleteTableForTab &&
                                          ('schema' in item ||
                                            'parsedSchema' in item)
                                            ? onDeleteTableForTab
                                            : undefined
                                        }
                                        onActivate={incrementFrequentUsage}
                                        onFocusItem={(title) => {
                                          setFocusedSidebarTitle(title);
                                          setFocusedSidebarGroupName('');
                                        }}
                                      />
                                    )}
                                  </div>
                                </SortableItem>
                              ))}
                              {items.length === 0 ? (
                                <div className="rounded border border-dashed border-slate-300 px-2 py-1 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                  Empty group
                                </div>
                              ) : null}
                            </div>
                          </SortableContent>
                        </Sortable>
                      )}
                    </div>
                  </SortableItem>
                );
              })}
            </div>
          </SortableContent>
        </Sortable>
      </div>

      {/* Toggle button at the bottom */}
      <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 dark:border-gray-800">
        <ToggleClose open={open} setOpen={setOpen} />
      </div>
      <AlertDialog
        open={pendingGroupDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingGroupDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete group?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingGroupDelete
                ? `${pendingGroupDelete.itemCount} sidebar item(s) inside "${pendingGroupDelete.name}" will be ungrouped and moved outside the group. No tables or sidebar items will be deleted.`
                : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!pendingGroupDelete || !onDeleteGroup) return;
                onDeleteGroup(pendingGroupDelete.name);
                setPendingGroupDelete(null);
              }}
            >
              Delete Group
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </nav>
  );
};

type OptionProps = {
  Icon: LucideIcon;
  iconName?: string;
  iconCatalog?: Array<[string, LucideIcon]>;
  title: string;
  url: string;
  selected: string;
  open: boolean;
  editable?: boolean;
  onBeginRename?: (title: string) => void;
  onRenameIcon?: (title: string, iconName: string) => void;
  onOpenWorkflowEditor?: (tabTitle: string) => void;
  onRequestDeleteTable?: (tabTitle: string) => void;
  onActivate?: (title: string) => void;
  onFocusItem?: (title: string) => void;
};

const Option = memo(function Option({
  Icon,
  iconName,
  iconCatalog = [],
  title,
  selected,
  open,
  editable = false,
  onBeginRename,
  onRenameIcon,
  onOpenWorkflowEditor,
  onRequestDeleteTable,
  onActivate,
  onFocusItem,
}: OptionProps) {
  useRegisterShortcut(SIDEBAR_SHORTCUTS.selectTabIconOption);
  const isSelected = selected === title;
  const hasRenameAction = editable && Boolean(onBeginRename);
  const hasWorkflowAction = Boolean(onOpenWorkflowEditor);
  const hasDeleteAction = Boolean(onRequestDeleteTable);
  const hasSideActions = hasWorkflowAction || hasDeleteAction;
  const actionPaddingClass = hasSideActions ? 'pr-8' : '';
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [iconSearch, setIconSearch] = useState('');

  const filteredIcons = useMemo(() => {
    const normalized = iconSearch.trim().toLowerCase();
    if (!normalized) return iconCatalog.slice(0, 60);
    return iconCatalog
      .filter(([name]) => name.toLowerCase().includes(normalized))
      .slice(0, 120);
  }, [iconCatalog, iconSearch]);

  const handleClick = () => {
    onActivate?.(title);
  };

  return (
    <div className="group/option relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            data-sidebar-item-link="true"
            data-sidebar-item-title={title}
            data-sidebar-item-link-title={title}
            onClick={handleClick}
            onFocus={() => onFocusItem?.(title)}
            to="."
            search={(current) => ({
              ...(current as Record<string, unknown>),
              tab: title,
            })}
            className={`relative flex h-11 w-full items-center rounded-md transition-all duration-200 ${
              isSelected
                ? 'bg-primary/60 text-accent-foreground shadow-sm border-l-2 border-primary/50'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-200'
            } ${actionPaddingClass}`}
          >
            <div className="grid h-full w-10 sm:w-12 place-content-center">
              <Popover
                open={isIconPickerOpen}
                onOpenChange={setIsIconPickerOpen}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="group/icon-trigger relative grid place-content-center rounded p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800"
                    data-sidebar-item-icon-trigger={title}
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      if (!editable || !onRenameIcon) return;
                      setIsIconPickerOpen(true);
                    }}
                  >
                    <Icon
                      className={`h-4 w-4 transition-opacity ${
                        editable && onRenameIcon
                          ? 'opacity-100 group-hover/icon-trigger:opacity-0 group-focus-visible/icon-trigger:opacity-0'
                          : ''
                      }`}
                    />
                    {editable && onRenameIcon ? (
                      <ChevronsUpDown className="pointer-events-none absolute inset-0 m-auto h-3.5 w-3.5 opacity-0 transition-opacity group-hover/icon-trigger:opacity-100 group-focus-visible/icon-trigger:opacity-100" />
                    ) : null}
                    {editable && onRenameIcon ? (
                      <span className="sr-only">Edit icon for tab {title}</span>
                    ) : null}
                  </button>
                </PopoverTrigger>
                {editable && onRenameIcon ? (
                  <PopoverContent align="start" className="w-72 p-2">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Icon options
                        </span>
                      </div>
                      <Input
                        value={iconSearch}
                        onChange={(event) => setIconSearch(event.target.value)}
                        placeholder="Search Lucide icons"
                        className="h-8 text-xs"
                      />
                      <div className="grid max-h-52 grid-cols-2 gap-1 overflow-y-auto">
                        {filteredIcons.map(([name, IconComponent]) => (
                          <button
                            key={`${title}-${name}`}
                            type="button"
                            className={`flex items-center gap-2 rounded border px-2 py-1 text-left text-xs hover:bg-muted ${
                              iconName === name
                                ? 'border-primary bg-primary/10'
                                : ''
                            }`}
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              onRenameIcon(title, name);
                              setIsIconPickerOpen(false);
                            }}
                          >
                            <IconComponent className="h-4 w-4 shrink-0" />
                            <span className="truncate">{name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </PopoverContent>
                ) : null}
              </Popover>
            </div>

            {open && (
              <span className="flex min-w-0 items-center gap-1">
                <span
                  className={`truncate text-sm font-medium transition-opacity duration-200 ${
                    open ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {title}
                </span>
                {hasRenameAction ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="rounded p-0.5 text-slate-500 opacity-100 transition-opacity md:opacity-0 hover:bg-slate-100 hover:text-slate-800 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group-focus-within/option:opacity-100 group-hover/option:opacity-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onBeginRename?.(title);
                        }}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Rename tab {title}</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="flex items-center gap-2"
                    >
                      <span>Rename tab</span>
                      <ShortcutKbd
                        actionId={SIDEBAR_SHORTCUTS.renameItem.id}
                        defaultBinding={
                          SIDEBAR_SHORTCUTS.renameItem.defaultBinding
                        }
                        interactive={false}
                      />
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </span>
            )}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          <span>Open tab</span>
          <ShortcutKbd
            actionId={SIDEBAR_SHORTCUTS.openFocusedTab.id}
            defaultBinding={SIDEBAR_SHORTCUTS.openFocusedTab.defaultBinding}
            interactive={false}
          />
          {editable && onRenameIcon ? (
            <ShortcutKbd
              actionId={SIDEBAR_SHORTCUTS.openFocusedTabIconPicker.id}
              defaultBinding={
                SIDEBAR_SHORTCUTS.openFocusedTabIconPicker.defaultBinding
              }
              interactive={false}
            />
          ) : null}
        </TooltipContent>
      </Tooltip>
      {hasSideActions ? (
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 transition-opacity md:opacity-0 group-focus-within/option:opacity-100 group-hover/option:opacity-100">
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="rounded-md border border-border/70 bg-background/75 p-1 text-slate-500 shadow-xs hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                    aria-label={`Actions for ${title}`}
                    title={`Actions for ${title}`}
                    data-sidebar-item-actions={title}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                <span>Open tab actions</span>
                <ShortcutKbd
                  actionId={SIDEBAR_SHORTCUTS.openItemActions.id}
                  defaultBinding={
                    SIDEBAR_SHORTCUTS.openItemActions.defaultBinding
                  }
                  interactive={false}
                />
              </TooltipContent>
            </Tooltip>
            <PopoverContent
              align="end"
              className="w-64 rounded-xl border-border/70 bg-popover/95 p-2.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-popover/85"
            >
              <div className="space-y-1.5">
                {hasWorkflowAction ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverClose asChild>
                        <button
                          type="button"
                          className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left hover:bg-muted/80"
                          onClick={() => {
                            onOpenWorkflowEditor?.(title);
                          }}
                        >
                          <span className="mt-0.5 grid size-7 shrink-0 place-content-center rounded-md bg-muted text-muted-foreground">
                            <Workflow className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium leading-tight">
                              Workflow settings
                            </span>
                            <span className="block text-[11px] leading-tight text-muted-foreground">
                              Edit triggers and automation
                            </span>
                          </span>
                        </button>
                      </PopoverClose>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="flex items-center gap-2"
                    >
                      <span>Open workflow settings</span>
                      <ShortcutKbd
                        actionId={SIDEBAR_SHORTCUTS.openFocusedTabWorkflow.id}
                        defaultBinding={
                          SIDEBAR_SHORTCUTS.openFocusedTabWorkflow
                            .defaultBinding
                        }
                        interactive={false}
                      />
                    </TooltipContent>
                  </Tooltip>
                ) : null}
                {hasDeleteAction ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PopoverClose asChild>
                        <button
                          type="button"
                          className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left text-destructive hover:bg-destructive/10"
                          onClick={() => {
                            onRequestDeleteTable?.(title);
                          }}
                        >
                          <span className="mt-0.5 grid size-7 shrink-0 place-content-center rounded-md bg-destructive/10 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-medium leading-tight">
                              Delete table
                            </span>
                            <span className="block text-[11px] leading-tight text-destructive/80">
                              Permanently remove this schema
                            </span>
                          </span>
                        </button>
                      </PopoverClose>
                    </TooltipTrigger>
                    <TooltipContent
                      side="right"
                      className="flex items-center gap-2"
                    >
                      <span>Delete focused table</span>
                      <ShortcutKbd
                        actionId={SIDEBAR_SHORTCUTS.deleteFocusedTabTable.id}
                        defaultBinding={
                          SIDEBAR_SHORTCUTS.deleteFocusedTabTable.defaultBinding
                        }
                        interactive={false}
                      />
                    </TooltipContent>
                  </Tooltip>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      ) : null}
    </div>
  );
}, areOptionPropsEqual);

function areOptionPropsEqual(prev: OptionProps, next: OptionProps) {
  return (
    prev.Icon === next.Icon &&
    prev.iconName === next.iconName &&
    prev.iconCatalog === next.iconCatalog &&
    prev.title === next.title &&
    prev.url === next.url &&
    prev.selected === next.selected &&
    prev.open === next.open &&
    prev.editable === next.editable &&
    prev.onBeginRename === next.onBeginRename &&
    prev.onRenameIcon === next.onRenameIcon &&
    prev.onOpenWorkflowEditor === next.onOpenWorkflowEditor &&
    prev.onRequestDeleteTable === next.onRequestDeleteTable &&
    prev.onActivate === next.onActivate &&
    prev.onFocusItem === next.onFocusItem
  );
}

Option.displayName = 'Option';

const TitleSection: React.FC<{
  open: boolean;
  businessName?: string;
  slug?: string;
  tabs: PossibleTabConfig[];
}> = ({ open, businessName, slug, tabs }) => {
  const { openDialog } = useDialog();
  const { logout, isAuthenticated } = useAuth();
  const user = useProfile();
  useRegisterShortcut(SIDEBAR_SHORTCUTS.managePlugins);

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
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      to="/$businessName/admin/plugins"
                      params={{ businessName: slug }}
                      className="gap-1"
                      data-sidebar-manage-plugins-link="true"
                    >
                      <PlugZapIcon className="size-4" />
                      Manage Plugins
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent
                    side="right"
                    className="flex items-center gap-2"
                  >
                    <span>Manage plugins</span>
                    <ShortcutKbd
                      actionId={SIDEBAR_SHORTCUTS.managePlugins.id}
                      defaultBinding={
                        SIDEBAR_SHORTCUTS.managePlugins.defaultBinding
                      }
                      interactive={false}
                    />
                  </TooltipContent>
                </Tooltip>
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

const GroupActionsPopover: React.FC<{
  editable: boolean;
  groupName: string;
  itemCount: number;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
  onBeginRenameGroup?: (groupName: string) => void;
  onMoveGroupUp?: () => void;
  onMoveGroupDown?: () => void;
  onRequestDeleteGroup: (groupName: string, itemCount: number) => void;
  onDeleteGroup?: (groupName: string) => void;
  onAddTable?: (targetGroupName?: string) => void;
  onAddGroup?: (groupName?: string, options?: GroupAddOptions) => void;
}> = ({
  editable,
  groupName,
  itemCount,
  canMoveUp = false,
  canMoveDown = false,
  onBeginRenameGroup,
  onMoveGroupUp,
  onMoveGroupDown,
  onRequestDeleteGroup,
  onDeleteGroup,
  onAddTable,
  onAddGroup,
}) => {
  useRegisterShortcut(SIDEBAR_SHORTCUTS.groupActionRename);
  useRegisterShortcut(SIDEBAR_SHORTCUTS.groupActionMoveUp);
  useRegisterShortcut(SIDEBAR_SHORTCUTS.groupActionMoveDown);
  useRegisterShortcut(SIDEBAR_SHORTCUTS.groupActionAddTable);
  useRegisterShortcut(SIDEBAR_SHORTCUTS.groupActionAddGroup);
  useRegisterShortcut(SIDEBAR_SHORTCUTS.groupActionAddGroupAbove);
  useRegisterShortcut(SIDEBAR_SHORTCUTS.groupActionAddGroupBelow);
  useRegisterShortcut(SIDEBAR_SHORTCUTS.groupActionDelete);
  useRegisterShortcut(SIDEBAR_SHORTCUTS.openFocusedGroupActions);
  if (
    !editable ||
    (!onDeleteGroup &&
      !onAddTable &&
      !onAddGroup &&
      !onBeginRenameGroup &&
      !onMoveGroupUp &&
      !onMoveGroupDown)
  ) {
    return null;
  }
  const actionButtonClass =
    'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50';
  const actionIconClass =
    'grid size-6 shrink-0 place-content-center rounded-md bg-muted text-muted-foreground';

  return (
    <Popover>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="rounded p-1 text-slate-500 opacity-100 transition-opacity md:opacity-0 hover:bg-slate-100 hover:text-slate-800 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group-focus-within/group-header:opacity-100 group-hover/group-header:opacity-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              aria-label={`Actions for ${groupName}`}
              title={`Actions for ${groupName}`}
              data-sidebar-group-name={groupName}
              data-sidebar-group-actions={groupName}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="right" className="flex items-center gap-2">
          <span>Open group actions</span>
          <ShortcutKbd
            actionId={SIDEBAR_SHORTCUTS.openFocusedGroupActions.id}
            defaultBinding={
              SIDEBAR_SHORTCUTS.openFocusedGroupActions.defaultBinding
            }
            interactive={false}
          />
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        align="end"
        className="w-64 rounded-xl border-border/70 bg-popover/95 p-2.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-popover/85"
      >
        <div className="space-y-1">
          <p className="px-1 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Group actions
          </p>
          {onBeginRenameGroup ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverClose asChild>
                  <button
                    type="button"
                    className={actionButtonClass}
                    onClick={() => {
                      onBeginRenameGroup(groupName);
                    }}
                  >
                    <span className={actionIconClass}>
                      <Pencil className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1">Rename Group</span>
                  </button>
                </PopoverClose>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                <span>Rename group</span>
                <ShortcutKbd
                  actionId={SIDEBAR_SHORTCUTS.groupActionRename.id}
                  defaultBinding={
                    SIDEBAR_SHORTCUTS.groupActionRename.defaultBinding
                  }
                  interactive={false}
                />
              </TooltipContent>
            </Tooltip>
          ) : null}
          {onMoveGroupUp ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverClose asChild>
                  <button
                    type="button"
                    className={actionButtonClass}
                    onClick={() => {
                      onMoveGroupUp();
                    }}
                    disabled={!canMoveUp}
                  >
                    <span className={actionIconClass}>
                      <ArrowUpToLine className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1">Move Group Up</span>
                  </button>
                </PopoverClose>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                <span>Move group up</span>
                <ShortcutKbd
                  actionId={SIDEBAR_SHORTCUTS.groupActionMoveUp.id}
                  defaultBinding={
                    SIDEBAR_SHORTCUTS.groupActionMoveUp.defaultBinding
                  }
                  interactive={false}
                />
              </TooltipContent>
            </Tooltip>
          ) : null}
          {onMoveGroupDown ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverClose asChild>
                  <button
                    type="button"
                    className={actionButtonClass}
                    onClick={() => {
                      onMoveGroupDown();
                    }}
                    disabled={!canMoveDown}
                  >
                    <span className={actionIconClass}>
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1">Move Group Down</span>
                  </button>
                </PopoverClose>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                <span>Move group down</span>
                <ShortcutKbd
                  actionId={SIDEBAR_SHORTCUTS.groupActionMoveDown.id}
                  defaultBinding={
                    SIDEBAR_SHORTCUTS.groupActionMoveDown.defaultBinding
                  }
                  interactive={false}
                />
              </TooltipContent>
            </Tooltip>
          ) : null}
          {onAddTable ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverClose asChild>
                  <button
                    type="button"
                    className={actionButtonClass}
                    onClick={() => {
                      onAddTable(groupName);
                    }}
                  >
                    <span className={actionIconClass}>
                      <Table2 className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1">Add Table</span>
                  </button>
                </PopoverClose>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                <span>Add table</span>
                <ShortcutKbd
                  actionId={SIDEBAR_SHORTCUTS.groupActionAddTable.id}
                  defaultBinding={
                    SIDEBAR_SHORTCUTS.groupActionAddTable.defaultBinding
                  }
                  interactive={false}
                />
              </TooltipContent>
            </Tooltip>
          ) : null}
          {onAddGroup ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverClose asChild>
                  <button
                    type="button"
                    className={actionButtonClass}
                    onClick={() => {
                      onAddGroup();
                    }}
                  >
                    <span className={actionIconClass}>
                      <Boxes className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1">Add Group</span>
                  </button>
                </PopoverClose>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                <span>Add group</span>
                <ShortcutKbd
                  actionId={SIDEBAR_SHORTCUTS.groupActionAddGroup.id}
                  defaultBinding={
                    SIDEBAR_SHORTCUTS.groupActionAddGroup.defaultBinding
                  }
                  interactive={false}
                />
              </TooltipContent>
            </Tooltip>
          ) : null}
          {onAddGroup ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverClose asChild>
                  <button
                    type="button"
                    className={actionButtonClass}
                    onClick={() => {
                      onAddGroup(undefined, {
                        relativeTo: groupName,
                        position: 'above',
                      });
                    }}
                  >
                    <span className={actionIconClass}>
                      <ArrowUpToLine className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1">Add Group Above</span>
                  </button>
                </PopoverClose>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                <span>Add group above</span>
                <ShortcutKbd
                  actionId={SIDEBAR_SHORTCUTS.groupActionAddGroupAbove.id}
                  defaultBinding={
                    SIDEBAR_SHORTCUTS.groupActionAddGroupAbove.defaultBinding
                  }
                  interactive={false}
                />
              </TooltipContent>
            </Tooltip>
          ) : null}
          {onAddGroup ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverClose asChild>
                  <button
                    type="button"
                    className={actionButtonClass}
                    onClick={() => {
                      onAddGroup(undefined, {
                        relativeTo: groupName,
                        position: 'below',
                      });
                    }}
                  >
                    <span className={actionIconClass}>
                      <ArrowDownToLine className="h-3.5 w-3.5" />
                    </span>
                    <span className="flex-1">Add Group Below</span>
                  </button>
                </PopoverClose>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                <span>Add group below</span>
                <ShortcutKbd
                  actionId={SIDEBAR_SHORTCUTS.groupActionAddGroupBelow.id}
                  defaultBinding={
                    SIDEBAR_SHORTCUTS.groupActionAddGroupBelow.defaultBinding
                  }
                  interactive={false}
                />
              </TooltipContent>
            </Tooltip>
          ) : null}
          {onDeleteGroup ? (
            <>
              <div className="my-1 h-px bg-border/80" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverClose asChild>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        onRequestDeleteGroup(groupName, itemCount);
                      }}
                    >
                      <span className="grid size-6 shrink-0 place-content-center rounded-md bg-destructive/10 text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1">Delete Group</span>
                    </button>
                  </PopoverClose>
                </TooltipTrigger>
                <TooltipContent
                  side="right"
                  className="flex items-center gap-2"
                >
                  <span>Delete group</span>
                  <ShortcutKbd
                    actionId={SIDEBAR_SHORTCUTS.groupActionDelete.id}
                    defaultBinding={
                      SIDEBAR_SHORTCUTS.groupActionDelete.defaultBinding
                    }
                    interactive={false}
                  />
                </TooltipContent>
              </Tooltip>
            </>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
};

const ToggleClose: React.FC<{
  open: boolean;
  setOpen: (open: boolean) => void;
}> = ({ open, setOpen }) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {/* biome-ignore lint/a11y/useButtonType: lint debt cleanup */}
        <button
          onClick={() => setOpen(!open)}
          data-auto-admin-sidebar-toggle="true"
          data-sidebar-open={open ? 'true' : 'false'}
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
      </TooltipTrigger>
      <TooltipContent side="right" className="flex items-center gap-2">
        <span>{open ? 'Hide sidebar' : 'Show sidebar'}</span>
        <ShortcutKbd
          actionId={
            open
              ? SIDEBAR_SHORTCUTS.closeSidebar.id
              : SIDEBAR_SHORTCUTS.openSidebar.id
          }
          defaultBinding={
            open
              ? SIDEBAR_SHORTCUTS.closeSidebar.defaultBinding
              : SIDEBAR_SHORTCUTS.openSidebar.defaultBinding
          }
          interactive={false}
        />
      </TooltipContent>
    </Tooltip>
  );
};

const CollapsibleSidebar = CollapsibleSidebarInner;
CollapsibleSidebar.displayName = 'CollapsibleSidebar';

export default CollapsibleSidebar;
