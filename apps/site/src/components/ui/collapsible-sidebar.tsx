import { Link, useLocation } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import {
  ChevronDown,
  ChevronRight,
  ChevronsRight,
  ChevronsUpDown,
  CirclePlus,
  GripVertical,
  LogOut,
  MoreHorizontal,
  Pencil,
  PlugZapIcon,
  Search,
  Settings,
  Star,
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
import { ManageOrganization } from './organizations/manage-organization';
import {
  Popover,
  PopoverClose,
  PopoverContent,
  PopoverTrigger,
} from './popover';

const SECTION_TOGGLE_BUTTON_CLASS =
  'flex w-full items-center justify-between rounded-md px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300 hover:bg-slate-100/60 dark:hover:bg-slate-800/60 active:bg-slate-200/60 dark:active:bg-slate-700/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-inset';

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
  const [draggedTabTitle, setDraggedTabTitle] = useState<string | null>(null);
  const [draggedGroupName, setDraggedGroupName] = useState<string | null>(null);
  const [groupDropIndicator, setGroupDropIndicator] = useState<{
    groupName: string;
    position: 'above' | 'below';
  } | null>(null);
  const [editingGroupName, setEditingGroupName] = useState<string | null>(null);
  const [editingTabTitle, setEditingTabTitle] = useState<string | null>(null);
  const [localGroupOrder, setLocalGroupOrder] = useState<string[]>([]);
  const [pendingGroupDelete, setPendingGroupDelete] = useState<{
    name: string;
    itemCount: number;
  } | null>(null);
  const tabRenameHandledByKeyRef = useRef(false);
  const groupRenameHandledByKeyRef = useRef(false);
  const dragPreviewElementRef = useRef<HTMLElement | null>(null);
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
    const baselineOrder =
      localGroupOrder.length > 0 ? localGroupOrder : (groups ?? []);
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
  }, [groupedItems, groups, localGroupOrder]);

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

  const clearDragPreviewElement = useCallback(() => {
    const previewElement = dragPreviewElementRef.current;
    if (previewElement?.parentNode) {
      previewElement.parentNode.removeChild(previewElement);
    }
    dragPreviewElementRef.current = null;
  }, []);

  const attachDragPreview = useCallback(
    (
      event: React.DragEvent<HTMLElement>,
      sourceElement: HTMLElement | null,
    ) => {
      if (!sourceElement) return;
      clearDragPreviewElement();

      const previewElement = sourceElement.cloneNode(true) as HTMLElement;
      const sourceRect = sourceElement.getBoundingClientRect();
      previewElement.style.position = 'fixed';
      previewElement.style.left = '-9999px';
      previewElement.style.top = '-9999px';
      previewElement.style.width = `${sourceRect.width}px`;
      previewElement.style.maxWidth = `${sourceRect.width}px`;
      previewElement.style.pointerEvents = 'none';
      previewElement.style.opacity = '0.96';
      previewElement.style.transform = 'scale(1.01)';
      previewElement.style.boxShadow =
        '0 24px 48px rgba(15, 23, 42, 0.22), 0 10px 20px rgba(15, 23, 42, 0.18)';
      previewElement.style.borderRadius = '10px';
      previewElement.style.zIndex = '9999';
      document.body.appendChild(previewElement);
      dragPreviewElementRef.current = previewElement;

      const offsetX = Math.max(12, Math.min(40, sourceRect.width * 0.2));
      const offsetY = Math.max(12, Math.min(28, sourceRect.height * 0.45));
      try {
        event.dataTransfer.setDragImage(previewElement, offsetX, offsetY);
      } catch (_error) {
        clearDragPreviewElement();
      }
    },
    [clearDragPreviewElement],
  );

  useEffect(() => () => clearDragPreviewElement(), [clearDragPreviewElement]);

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
                    selected={currentTab}
                    open={open}
                    onActivate={incrementFrequentUsage}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        <div
          className="space-y-1"
          onDragOver={(event) => {
            if (!editable || !onMoveTabToGroup) return;
            event.preventDefault();
          }}
          onDrop={(event) => {
            event.preventDefault();
            if (!editable || !onMoveTabToGroup) return;
            const dropped =
              event.dataTransfer.getData('text/tab-title') || draggedTabTitle;
            if (!dropped) return;
            onMoveTabToGroup(dropped, undefined);
            setDraggedTabTitle(null);
            setGroupDropIndicator(null);
          }}
        >
          {editable ? (
            <div className="flex items-center justify-between rounded-md border border-dashed border-slate-300 px-2 py-1 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
              <span>Drop here to ungroup</span>
              <QuickAddPopover
                editable={editable}
                onAddGroup={onAddGroup}
                onAddTable={onAddTable}
              />
            </div>
          ) : null}
          {ungroupedItems.map((item, index) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
              key={index}
              draggable={editable}
              onDragStart={(event) => {
                if (!editable) return;
                setDraggedTabTitle(item.title);
                attachDragPreview(event, event.currentTarget);
                try {
                  event.dataTransfer.setData('text/tab-title', item.title);
                } catch (_error) {
                  // noop
                }
              }}
              onDragEnd={() => {
                setDraggedTabTitle(null);
                clearDragPreviewElement();
              }}
            >
              {editingTabTitle === item.title ? (
                <Input
                  autoFocus
                  defaultValue={item.title}
                  className="h-8 text-xs"
                  onBlur={(event) => {
                    if (tabRenameHandledByKeyRef.current) {
                      tabRenameHandledByKeyRef.current = false;
                    } else {
                      commitTabRename(item.title, event.currentTarget.value);
                    }
                    setEditingTabTitle(null);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      tabRenameHandledByKeyRef.current = true;
                      commitTabRename(item.title, event.currentTarget.value);
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
                />
              )}
            </div>
          ))}
        </div>

        {/* Grouped navigation items */}
        {groupNamesToRender.map((groupName) => {
          const items = groupedItems[groupName] ?? [];
          const isGroupOpen = groupOpenState[groupName] ?? true;
          const isDropTarget = groupDropIndicator?.groupName === groupName;
          return (
            <div
              key={groupName}
              data-sidebar-group-card="true"
              className={`relative mt-1 rounded-lg border p-1 ${
                isDropTarget
                  ? 'border-primary/60 bg-primary/5'
                  : 'border-slate-200/80 dark:border-slate-800'
              }`}
              onDragOver={(event) => {
                if (!editable || (!onMoveTabToGroup && !onReorderGroups))
                  return;
                event.preventDefault();
                const droppedGroup =
                  event.dataTransfer.getData('text/group-name') ||
                  draggedGroupName;
                if (!droppedGroup) {
                  if (groupDropIndicator) setGroupDropIndicator(null);
                  return;
                }
                const bounds = event.currentTarget.getBoundingClientRect();
                const position: 'above' | 'below' =
                  event.clientY - bounds.top < bounds.height / 2
                    ? 'above'
                    : 'below';
                setGroupDropIndicator((current) => {
                  if (
                    current?.groupName === groupName &&
                    current.position === position
                  ) {
                    return current;
                  }
                  return { groupName, position };
                });
              }}
              onDragLeave={(event) => {
                if (groupDropIndicator?.groupName !== groupName) return;
                const nextTarget = event.relatedTarget as Node | null;
                if (!event.currentTarget.contains(nextTarget)) {
                  setGroupDropIndicator(null);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (!editable) return;
                const droppedGroup =
                  event.dataTransfer.getData('text/group-name') ||
                  draggedGroupName;
                if (droppedGroup) {
                  setLocalGroupOrder((current) => {
                    const baseline =
                      current.length > 0 ? [...current] : groupNamesToRender;
                    if (!baseline.includes(droppedGroup))
                      baseline.push(droppedGroup);
                    if (!baseline.includes(groupName)) baseline.push(groupName);
                    const fromIndex = baseline.indexOf(droppedGroup);
                    const toIndex = baseline.indexOf(groupName);
                    if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) {
                      return current;
                    }
                    const next = baseline.filter(
                      (name) => name !== droppedGroup,
                    );
                    const targetIndex = next.indexOf(groupName);
                    if (targetIndex < 0) return current;
                    const preferredPosition =
                      groupDropIndicator?.groupName === groupName
                        ? groupDropIndicator.position
                        : 'below';
                    const insertAt =
                      preferredPosition === 'above'
                        ? targetIndex
                        : targetIndex + 1;
                    next.splice(insertAt, 0, droppedGroup);
                    return next;
                  });
                  const preferredPosition =
                    groupDropIndicator?.groupName === groupName
                      ? groupDropIndicator.position
                      : 'below';
                  onReorderGroups?.(droppedGroup, groupName, preferredPosition);
                  setDraggedGroupName(null);
                  setGroupDropIndicator(null);
                  return;
                }
                if (!onMoveTabToGroup) return;
                const dropped =
                  event.dataTransfer.getData('text/tab-title') ||
                  draggedTabTitle;
                if (!dropped) return;
                onMoveTabToGroup(dropped, groupName);
                setDraggedTabTitle(null);
                setGroupDropIndicator(null);
              }}
            >
              {isDropTarget && groupDropIndicator?.position === 'above' ? (
                <div className="pointer-events-none absolute -top-[1px] left-1 right-1 h-[2px] rounded bg-primary" />
              ) : null}
              {isDropTarget && groupDropIndicator?.position === 'below' ? (
                <div className="pointer-events-none absolute -bottom-[1px] left-1 right-1 h-[2px] rounded bg-primary" />
              ) : null}
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
                        commitGroupRename(groupName, event.currentTarget.value);
                      }
                      setEditingGroupName(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault();
                        groupRenameHandledByKeyRef.current = true;
                        commitGroupRename(groupName, event.currentTarget.value);
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
                      <button
                        type="button"
                        draggable
                        className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onDoubleClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onDragStart={(event) => {
                          setDraggedGroupName(groupName);
                          setGroupDropIndicator(null);
                          const groupCard = (
                            event.currentTarget as HTMLElement
                          ).closest(
                            '[data-sidebar-group-card="true"]',
                          ) as HTMLElement | null;
                          attachDragPreview(
                            event,
                            groupCard ?? event.currentTarget,
                          );
                          try {
                            event.dataTransfer.setData(
                              'text/group-name',
                              groupName,
                            );
                          } catch (_error) {
                            // noop
                          }
                        }}
                        onDragEnd={() => {
                          setDraggedGroupName(null);
                          setGroupDropIndicator(null);
                          clearDragPreviewElement();
                        }}
                        aria-label={`Drag group ${groupName}`}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupName)}
                      aria-expanded={isGroupOpen}
                      className={`${SECTION_TOGGLE_BUTTON_CLASS} flex-1`}
                      style={{ WebkitTapHighlightColor: 'transparent' }}
                    >
                      <span>{groupName}</span>
                    </button>
                    {editable && onRenameGroup ? (
                      <button
                        type="button"
                        className="rounded p-1 text-slate-500 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-800 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group-focus-within/group-header:opacity-100 group-hover/group-header:opacity-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          beginGroupRename(groupName);
                        }}
                        aria-label={`Rename group ${groupName}`}
                        title={`Rename group ${groupName}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    ) : null}
                    <GroupActionsPopover
                      editable={editable}
                      groupName={groupName}
                      itemCount={items.length}
                      onRequestDeleteGroup={requestDeleteGroup}
                      onDeleteGroup={onDeleteGroup}
                      onAddGroup={onAddGroup}
                      onAddTable={onAddTable}
                    />
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupName)}
                      aria-expanded={isGroupOpen}
                      aria-label={
                        isGroupOpen
                          ? `Collapse group ${groupName}`
                          : `Expand group ${groupName}`
                      }
                      className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                      style={{ WebkitTapHighlightColor: 'transparent' }}
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
                <div className="space-y-1 p-1">
                  {items.map((item, index) => (
                    <div
                      key={`${groupName}-${
                        // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
                        index
                      }`}
                      draggable={editable}
                      onDragStart={(event) => {
                        if (!editable) return;
                        setDraggedTabTitle(item.title);
                        attachDragPreview(event, event.currentTarget);
                        try {
                          event.dataTransfer.setData(
                            'text/tab-title',
                            item.title,
                          );
                        } catch (_error) {
                          // noop
                        }
                      }}
                      onDragEnd={() => {
                        setDraggedTabTitle(null);
                        clearDragPreviewElement();
                      }}
                    >
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
                        />
                      )}
                    </div>
                  ))}
                  {items.length === 0 ? (
                    <div className="rounded border border-dashed border-slate-300 px-2 py-1 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      Empty group
                    </div>
                  ) : null}
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

const QuickAddPopover: React.FC<{
  editable: boolean;
  targetGroupName?: string;
  onAddTable?: (targetGroupName?: string) => void;
  onAddGroup?: (groupName?: string, options?: GroupAddOptions) => void;
}> = ({ editable, targetGroupName, onAddTable, onAddGroup }) => {
  if (!editable || (!onAddTable && !onAddGroup)) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
          aria-label={
            targetGroupName ? `Add in ${targetGroupName}` : 'Add item'
          }
        >
          <CirclePlus className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <div className="space-y-1">
          {onAddTable ? (
            <PopoverClose asChild>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                onClick={() => {
                  onAddTable(targetGroupName);
                }}
              >
                Add Table
              </button>
            </PopoverClose>
          ) : null}
          {onAddGroup ? (
            <PopoverClose asChild>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                onClick={() => {
                  onAddGroup();
                }}
              >
                Add Group
              </button>
            </PopoverClose>
          ) : null}
          {onAddGroup && targetGroupName ? (
            <PopoverClose asChild>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                onClick={() => {
                  onAddGroup(undefined, {
                    relativeTo: targetGroupName,
                    position: 'above',
                  });
                }}
              >
                Add Group Above
              </button>
            </PopoverClose>
          ) : null}
          {onAddGroup && targetGroupName ? (
            <PopoverClose asChild>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                onClick={() => {
                  onAddGroup(undefined, {
                    relativeTo: targetGroupName,
                    position: 'below',
                  });
                }}
              >
                Add Group Below
              </button>
            </PopoverClose>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
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
}: OptionProps) {
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
      <Link
        onClick={handleClick}
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
          <Popover open={isIconPickerOpen} onOpenChange={setIsIconPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="grid place-content-center rounded p-0.5"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onDoubleClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (!editable || !onRenameIcon) return;
                  setIsIconPickerOpen(true);
                }}
              >
                <Icon className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            {editable && onRenameIcon ? (
              <PopoverContent align="start" className="w-72 p-2">
                <div className="space-y-2">
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
              <button
                type="button"
                className="rounded p-0.5 text-slate-500 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-800 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group-focus-within/option:opacity-100 group-hover/option:opacity-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onBeginRename?.(title);
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
                <span className="sr-only">Rename tab {title}</span>
              </button>
            ) : null}
          </span>
        )}
      </Link>
      {hasSideActions ? (
        <div className="absolute right-1 top-1/2 flex -translate-y-1/2 items-center gap-0.5 transition-opacity md:opacity-0 group-focus-within/option:opacity-100 group-hover/option:opacity-100">
          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="rounded p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                aria-label={`Actions for ${title}`}
                title={`Actions for ${title}`}
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1">
              <div className="space-y-1">
                {hasWorkflowAction ? (
                  <PopoverClose asChild>
                    <button
                      type="button"
                      className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                      onClick={() => {
                        onOpenWorkflowEditor?.(title);
                      }}
                    >
                      Workflow settings
                    </button>
                  </PopoverClose>
                ) : null}
                {hasDeleteAction ? (
                  <PopoverClose asChild>
                    <button
                      type="button"
                      className="w-full rounded px-2 py-1 text-left text-xs text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        onRequestDeleteTable?.(title);
                      }}
                    >
                      Delete table
                    </button>
                  </PopoverClose>
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
    prev.onActivate === next.onActivate
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

const GroupActionsPopover: React.FC<{
  editable: boolean;
  groupName: string;
  itemCount: number;
  onRequestDeleteGroup: (groupName: string, itemCount: number) => void;
  onDeleteGroup?: (groupName: string) => void;
  onAddTable?: (targetGroupName?: string) => void;
  onAddGroup?: (groupName?: string, options?: GroupAddOptions) => void;
}> = ({
  editable,
  groupName,
  itemCount,
  onRequestDeleteGroup,
  onDeleteGroup,
  onAddTable,
  onAddGroup,
}) => {
  if (!editable || (!onDeleteGroup && !onAddTable && !onAddGroup)) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="rounded p-1 text-slate-500 opacity-0 transition-opacity hover:bg-slate-100 hover:text-slate-800 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 group-focus-within/group-header:opacity-100 group-hover/group-header:opacity-100 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          aria-label={`Actions for ${groupName}`}
          title={`Actions for ${groupName}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1">
        <div className="space-y-1">
          {onAddTable ? (
            <PopoverClose asChild>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                onClick={() => {
                  onAddTable(groupName);
                }}
              >
                Add Table
              </button>
            </PopoverClose>
          ) : null}
          {onAddGroup ? (
            <PopoverClose asChild>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                onClick={() => {
                  onAddGroup();
                }}
              >
                Add Group
              </button>
            </PopoverClose>
          ) : null}
          {onAddGroup ? (
            <PopoverClose asChild>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                onClick={() => {
                  onAddGroup(undefined, {
                    relativeTo: groupName,
                    position: 'above',
                  });
                }}
              >
                Add Group Above
              </button>
            </PopoverClose>
          ) : null}
          {onAddGroup ? (
            <PopoverClose asChild>
              <button
                type="button"
                className="w-full rounded px-2 py-1 text-left text-xs hover:bg-muted"
                onClick={() => {
                  onAddGroup(undefined, {
                    relativeTo: groupName,
                    position: 'below',
                  });
                }}
              >
                Add Group Below
              </button>
            </PopoverClose>
          ) : null}
          {onDeleteGroup ? (
            <>
              <div className="my-1 h-px bg-border" />
              <PopoverClose asChild>
                <button
                  type="button"
                  className="w-full rounded px-2 py-1 text-left text-xs text-destructive hover:bg-destructive/10"
                  onClick={() => {
                    onRequestDeleteGroup(groupName, itemCount);
                  }}
                >
                  Delete Group
                </button>
              </PopoverClose>
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

const CollapsibleSidebar = memo(CollapsibleSidebarInner);
CollapsibleSidebar.displayName = 'CollapsibleSidebar';

export default CollapsibleSidebar;
