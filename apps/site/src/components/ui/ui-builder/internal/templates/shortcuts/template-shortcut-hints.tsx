import type React from 'react';
import { ShortcutKbd } from '@/components/ui/keyboard-shortcuts';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { TEMPLATE_SHORTCUTS } from './template-shortcuts';

export function TemplateShortcutHint({
  label,
  actionId,
  children,
}: {
  label: string;
  actionId: string;
  children: React.ReactElement;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        sideOffset={6}
        className="flex items-center gap-2 border bg-accent font-semibold text-foreground dark:bg-zinc-900 [&>span]:hidden"
      >
        <span>{label}</span>
        <ShortcutKbd actionId={actionId} interactive={false} />
      </TooltipContent>
    </Tooltip>
  );
}

export function TemplateShortcutSettingsEntry() {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-muted-foreground">Shortcut settings</span>
      <ShortcutKbd
        actionId={TEMPLATE_SHORTCUTS.openSheet.id}
        interaction="open-settings"
      />
    </div>
  );
}
