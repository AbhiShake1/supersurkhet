import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';
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
import { useShortcutAction } from '@/components/ui/keyboard-shortcuts';

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
  triggerLabel?: string;
  placeholder?: string;
};

export function AutoAdminGlobalCommand({
  actions,
  tabs,
  members = [],
  records = [],
  triggerLabel = 'Search anything',
  placeholder = 'Search actions, tables, members, and data...',
}: AutoAdminGlobalCommandProps) {
  const [isOpen, setIsOpen] = useState(false);
  const hasActions = actions.length > 0;
  const hasRecords = records.length > 0;
  const hasMembers = members.length > 0;
  const hasTabs = tabs.length > 0;

  useShortcutAction(GLOBAL_COMMAND_SHORTCUT, () => {
    setIsOpen((current) => !current);
  });

  const description = useMemo(() => {
    return 'Quick actions and organization-wide search for AutoAdmin.';
  }, []);

  return (
    <>
      <button
        type="button"
        className="flex h-9 min-w-[220px] items-center justify-between rounded-md border border-border/70 bg-muted/30 px-3 text-sm text-muted-foreground transition hover:border-border hover:text-foreground"
        onClick={() => setIsOpen(true)}
      >
        <span className="inline-flex items-center gap-2">
          <Search className="size-4" />
          {triggerLabel}
        </span>
        <span className="text-xs">Ctrl/⌘ K</span>
      </button>
      <CommandDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        title={triggerLabel}
        description={description}
      >
        <CommandInput placeholder={placeholder} />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {hasActions ? (
            <CommandGroup heading="Actions">
              {actions.map((action) => (
                <CommandItem
                  key={action.id}
                  value={`${action.label} ${action.keywords ?? ''}`}
                  onSelect={() => {
                    setIsOpen(false);
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

          {hasActions && (hasTabs || hasRecords || hasMembers) ? (
            <CommandSeparator />
          ) : null}

          {hasTabs ? (
            <CommandGroup heading="Tables & Pages">
              {tabs.map((tab) => (
                <CommandItem
                  key={tab.id}
                  value={`${tab.title} ${tab.group ?? ''} ${tab.keywords ?? ''}`}
                  onSelect={() => {
                    setIsOpen(false);
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

          {hasTabs && (hasRecords || hasMembers) ? <CommandSeparator /> : null}

          {hasRecords ? (
            <CommandGroup heading="Data">
              {records.map((record) => (
                <CommandItem
                  key={record.id}
                  value={`${record.label} ${record.description ?? ''} ${record.scopeLabel ?? ''} ${record.keywords ?? ''}`}
                  onSelect={() => {
                    setIsOpen(false);
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
              {members.map((member) => (
                <CommandItem
                  key={member.id}
                  value={`${member.label} ${member.description ?? ''} ${member.keywords ?? ''}`}
                  onSelect={() => {
                    setIsOpen(false);
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
