import { rankItem } from '@tanstack/match-sorter-utils';
import { Search } from 'lucide-react';
import { useState } from 'react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import {
  ShortcutKbd,
  useShortcutAction,
} from '@/components/ui/keyboard-shortcuts';

const GLOBAL_COMMAND_SHORTCUT = {
  id: 'autoAdmin.globalCommand',
  label: 'Open global command',
  description: 'Search tables, members, and actions across AutoAdmin.',
  scope: 'AutoAdmin',
  defaultBinding: {
    key: 'k',
    ctrl: false,
    meta: true,
    alt: false,
    shift: false,
  },
} as const;

type AutoAdminGlobalCommandAction = {
  id: string;
  label: string;
  keywords?: string;
  shortcut?: string;
  onSelect: () => void;
};

type AutoAdminGlobalCommandTab = {
  id: string;
  title: string;
  group?: string;
  active?: boolean;
  keywords?: string;
  onSelect: () => void;
};

type AutoAdminGlobalCommandMember = {
  id: string;
  label: string;
  description?: string;
  keywords?: string;
  onSelect?: () => void;
};

type AutoAdminGlobalCommandRecord = {
  id: string;
  label: string;
  description?: string;
  scopeLabel?: string;
  keywords?: string;
  onSelect: () => void;
};

type AutoAdminGlobalCommandProps = {
  actions: AutoAdminGlobalCommandAction[];
  tabs: AutoAdminGlobalCommandTab[];
  members?: AutoAdminGlobalCommandMember[];
  records?: AutoAdminGlobalCommandRecord[];
  isSearchingData?: boolean;
  onOpenChange?: (open: boolean) => void;
  triggerLabel?: string;
  placeholder?: string;
};

export function AutoAdminGlobalCommand({
  actions,
  tabs,
  members = [],
  records = [],
  isSearchingData = false,
  onOpenChange,
  triggerLabel = 'Search anything',
  placeholder = 'Search actions, tables, members, and data...',
}: AutoAdminGlobalCommandProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();

  const scoreParts = (parts: Array<string | undefined>) => {
    if (!normalizedQuery) return { passed: true, score: 0 };
    let bestRank = Number.NEGATIVE_INFINITY;
    let passed = false;
    let boost = 0;
    const queryTokens = normalizedQuery.split(/\s+/).filter(Boolean);

    for (const rawPart of parts) {
      if (!rawPart) continue;
      const part = rawPart.toLowerCase();
      const rank = rankItem(part, normalizedQuery);
      if (rank.passed) passed = true;
      if (rank.rank > bestRank) bestRank = rank.rank;

      if (part === normalizedQuery) boost = Math.max(boost, 1000);
      else if (part.startsWith(normalizedQuery)) boost = Math.max(boost, 600);
      else if (part.includes(normalizedQuery)) boost = Math.max(boost, 300);

      const tokenMatches = queryTokens.filter((token) => part.includes(token));
      if (tokenMatches.length > 0) {
        boost = Math.max(boost, tokenMatches.length * 40);
      }
    }

    return {
      passed,
      score: (Number.isFinite(bestRank) ? bestRank : -1000) + boost,
    };
  };

  const rankAndSort = <T,>(
    items: T[],
    partsBuilder: (item: T) => Array<string | undefined>,
  ) => {
    if (!normalizedQuery) return items;
    return items
      .map((item) => {
        const parts = partsBuilder(item);
        const { passed, score } = scoreParts(parts);
        return { item, passed, score };
      })
      .filter((entry) => entry.passed)
      .sort((left, right) => right.score - left.score)
      .map((entry) => entry.item);
  };

  const filteredActions = rankAndSort(actions, (action) => [
    action.label,
    action.keywords,
    action.shortcut,
  ]);
  const filteredTabs = rankAndSort(tabs, (tab) => [
    tab.title,
    tab.group,
    tab.keywords,
  ]);
  const filteredMembers = rankAndSort(members, (member) => [
    member.label,
    member.description,
    member.keywords,
  ]);
  const filteredRecords = rankAndSort(records, (record) => [
    record.label,
    record.description,
    record.scopeLabel,
    record.keywords,
  ]);

  const hasRecords = filteredRecords.length > 0;
  const hasMembers = filteredMembers.length > 0;
  const hasTabs = filteredTabs.length > 0;
  const hasFilteredActions = filteredActions.length > 0;
  const prioritizeDataSection = normalizedQuery.length > 0 && hasRecords;

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) setQuery('');
    onOpenChange?.(open);
  };

  useShortcutAction(GLOBAL_COMMAND_SHORTCUT, () => {
    handleOpenChange(!isOpen);
  });

  const description =
    'Quick actions and organization-wide search for AutoAdmin.';

  return (
    <>
      <button
        type="button"
        className="flex h-9 min-w-[220px] items-center justify-between rounded-md border border-border/70 bg-muted/30 px-3 text-sm text-muted-foreground transition hover:border-border hover:text-foreground"
        onClick={() => handleOpenChange(true)}
      >
        <span className="inline-flex items-center gap-2">
          <Search className="size-4" />
          {triggerLabel}
        </span>
        <span className="text-xs">
          <ShortcutKbd
            actionId={GLOBAL_COMMAND_SHORTCUT.id}
            interactive={false}
          />
        </span>
      </button>
      <CommandDialog
        open={isOpen}
        onOpenChange={handleOpenChange}
        title={triggerLabel}
        description={description}
        commandProps={{ shouldFilter: false }}
      >
        <CommandInput
          placeholder={placeholder}
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {prioritizeDataSection ? (
            <CommandGroup heading="Data">
              {filteredRecords.map((record) => (
                <CommandItem
                  key={record.id}
                  value={`${record.label} ${record.description ?? ''} ${record.scopeLabel ?? ''} ${record.keywords ?? ''}`}
                  onSelect={() => {
                    handleOpenChange(false);
                    record.onSelect();
                  }}
                >
                  <span className="truncate">{record.label}</span>
                  {record.scopeLabel ? (
                    <span className="ml-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] leading-none text-muted-foreground">
                      {record.scopeLabel}
                    </span>
                  ) : null}
                  <CommandShortcut>Row</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {prioritizeDataSection &&
          (hasFilteredActions || hasTabs || hasMembers) ? (
            <CommandSeparator />
          ) : null}

          {hasFilteredActions ? (
            <CommandGroup heading="Actions">
              {filteredActions.map((action) => (
                <CommandItem
                  key={action.id}
                  value={`${action.label} ${action.keywords ?? ''}`}
                  onSelect={() => {
                    handleOpenChange(false);
                    action.onSelect();
                  }}
                >
                  {action.label}
                  <CommandShortcut>
                    {action.shortcut ?? 'Action'}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {hasFilteredActions && (hasTabs || hasRecords || hasMembers) ? (
            <CommandSeparator />
          ) : null}

          {hasTabs ? (
            <CommandGroup heading="Tables & Pages">
              {filteredTabs.map((tab) => (
                <CommandItem
                  key={tab.id}
                  value={`${tab.title} ${tab.group ?? ''} ${tab.keywords ?? ''}`}
                  onSelect={() => {
                    handleOpenChange(false);
                    tab.onSelect();
                  }}
                >
                  <span className="truncate">{tab.title}</span>
                  {tab.group ? (
                    <span className="ml-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] leading-none text-muted-foreground">
                      {tab.group}
                    </span>
                  ) : null}
                  <CommandShortcut>
                    {tab.active ? 'Current' : 'Table'}
                  </CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {hasTabs && ((!prioritizeDataSection && hasRecords) || hasMembers) ? (
            <CommandSeparator />
          ) : null}

          {isSearchingData ? (
            <CommandGroup heading="Data">
              <CommandItem disabled>Indexing project data...</CommandItem>
            </CommandGroup>
          ) : null}

          {!prioritizeDataSection && hasRecords ? (
            <CommandGroup heading="Data">
              {filteredRecords.map((record) => (
                <CommandItem
                  key={record.id}
                  value={`${record.label} ${record.description ?? ''} ${record.scopeLabel ?? ''} ${record.keywords ?? ''}`}
                  onSelect={() => {
                    handleOpenChange(false);
                    record.onSelect();
                  }}
                >
                  <span className="truncate">{record.label}</span>
                  {record.scopeLabel ? (
                    <span className="ml-1 rounded-full border border-border/70 bg-muted/40 px-2 py-0.5 text-[10px] leading-none text-muted-foreground">
                      {record.scopeLabel}
                    </span>
                  ) : null}
                  <CommandShortcut>Row</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}

          {hasRecords && hasMembers ? <CommandSeparator /> : null}

          {hasMembers ? (
            <CommandGroup heading="Members">
              {filteredMembers.map((member) => (
                <CommandItem
                  key={member.id}
                  value={`${member.label} ${member.description ?? ''} ${member.keywords ?? ''}`}
                  onSelect={() => {
                    handleOpenChange(false);
                    member.onSelect?.();
                  }}
                >
                  <span className="truncate">{member.label}</span>
                  {member.description ? (
                    <span className="ml-1 truncate text-xs text-muted-foreground">
                      {member.description}
                    </span>
                  ) : null}
                  <CommandShortcut>Member</CommandShortcut>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : null}
        </CommandList>
      </CommandDialog>
    </>
  );
}
