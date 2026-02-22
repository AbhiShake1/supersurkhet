export type PluginCardStatus = 'draft' | 'active' | 'paused' | 'archived';

export type PluginCard = {
  id: string;
  pluginId: string;
  title: string;
  status: PluginCardStatus;
  description?: string;
};

export type PluginCardStatusGroup = {
  status: PluginCardStatus;
  label: string;
  description: string;
  items: PluginCard[];
};

const STATUS_ORDER: readonly PluginCardStatus[] = [
  'draft',
  'active',
  'paused',
  'archived',
];

const STATUS_META: Record<
  PluginCardStatus,
  { label: string; description: string }
> = {
  draft: {
    label: 'Draft',
    description: 'Plugins with active draft work in progress.',
  },
  active: {
    label: 'Active',
    description: 'Plugins currently installed and maintained.',
  },
  paused: {
    label: 'Paused',
    description: 'Installed plugins currently paused.',
  },
  archived: {
    label: 'Archived',
    description: 'Plugins with archived drafts and no active install.',
  },
};

export function resolvePluginCardStatus({
  latestDraftStatus,
  installStatus,
}: {
  latestDraftStatus: 'active' | 'archived' | undefined;
  installStatus: 'active' | 'paused' | undefined;
}): PluginCardStatus {
  if (latestDraftStatus === 'active') return 'draft';
  if (installStatus === 'paused') return 'paused';
  if (installStatus === 'active') return 'active';
  if (latestDraftStatus === 'archived') return 'archived';
  return 'active';
}

export function groupPluginCardsByStatus(
  cards: readonly PluginCard[],
): PluginCardStatusGroup[] {
  const byStatus = new Map<PluginCardStatus, PluginCard[]>();
  for (const status of STATUS_ORDER) byStatus.set(status, []);
  for (const card of cards) {
    byStatus.get(card.status)?.push(card);
  }
  return STATUS_ORDER.map((status) => {
    const meta = STATUS_META[status];
    return {
      status,
      label: meta.label,
      description: meta.description,
      items: byStatus.get(status) ?? [],
    };
  }).filter((group) => group.items.length > 0);
}
