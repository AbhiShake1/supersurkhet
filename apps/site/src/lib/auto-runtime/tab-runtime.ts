import type { SchemaKeys } from '@gta/react-hooks';
import type { LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { appSchema } from '@/lib/schema';

type TabLike = {
  title?: string;
  group?: string;
  icon?: LucideIcon;
  iconName?: string;
  schema?: SchemaKeys | string;
};

function toTitleCase(schema: string | undefined) {
  return schema
    ?.replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (char) => char.toUpperCase());
}

function normalizeTabTitle(title: unknown): string {
  if (typeof title !== 'string') {
    return 'Untitled';
  }

  const normalized = title.trim();
  return normalized || 'Untitled';
}

function resolveSchemaMeta(schema: string | undefined) {
  if (!schema) {
    return undefined;
  }

  const meta = (appSchema as Record<string, unknown>)[schema] as
    | {
        title?: string;
        group?: string;
        icon?: LucideIcon;
      }
    | undefined;

  return meta;
}

export function resolveIconByName(
  iconName: string | undefined,
): LucideIcon | undefined {
  if (!iconName) return undefined;

  return (LucideIcons.icons as Record<string, LucideIcon | undefined>)[
    iconName
  ];
}

export function resolveAdminTabInput<TTab extends TabLike>(
  tab: TTab,
): TTab & {
  title: string;
  group?: string;
  icon?: LucideIcon;
} {
  const schemaMeta = resolveSchemaMeta(tab.schema);
  const title = normalizeTabTitle(
    tab.title ?? schemaMeta?.title ?? toTitleCase(tab.schema),
  );

  return {
    ...tab,
    title,
    group: tab.group ?? schemaMeta?.group,
    icon: tab.icon ?? schemaMeta?.icon,
  };
}

export function dedupeAdminTabs<TTab extends { title?: string }>(
  tabs: TTab[],
  keyBuilder?: (tab: TTab) => string,
): TTab[] {
  const seen = new Set<string>();
  const out: TTab[] = [];

  for (const tab of tabs) {
    const key = keyBuilder ? keyBuilder(tab) : normalizeTabTitle(tab.title);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    out.push(tab);
  }

  return out;
}

export function normalizeAutoTableTab<
  TTab extends Record<string, unknown> & { slug?: string; data?: unknown },
>(tab: TTab, basePath: string): TTab {
  if (tab.data !== undefined) {
    return tab;
  }

  return {
    ...tab,
    slug: tab.slug ?? basePath,
  };
}
