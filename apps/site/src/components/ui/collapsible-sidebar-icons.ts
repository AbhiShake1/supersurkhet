import type { LucideIcon } from 'lucide-react';
import { LucideBriefcaseBusiness, Menu } from 'lucide-react';
import { appSchema } from '@/lib/schema';
import type { PossibleTabConfig } from '../auto-admin';

function isLucideIcon(value: unknown): value is LucideIcon {
  return typeof value === 'function';
}

export function getTabIcon(
  tab: PossibleTabConfig | null | undefined,
): LucideIcon {
  if (!tab || typeof tab !== 'object') return Menu;
  if ('icon' in tab && tab.icon) return tab.icon;
  if ('schema' in tab && typeof tab.schema === 'string') {
    const schemaIcon = appSchema[tab.schema]?.icon;
    if (isLucideIcon(schemaIcon)) return schemaIcon;
    return LucideBriefcaseBusiness;
  }
  return Menu;
}
