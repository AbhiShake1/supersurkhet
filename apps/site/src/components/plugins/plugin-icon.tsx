import type { SchemaKeys } from '@gta/react-hooks';
import { AutoTable } from '@/components/auto-table';
import type { PluginMarketItem } from '@/lib/plugins/admin-plugin-market';

export function PluginIcon({
  plugin,
  compact = false,
}: {
  plugin: PluginMarketItem;
  compact?: boolean;
}) {
  const iconSize = compact ? 'w-full h-full' : 'w-full h-full';
  const previewSchema = plugin.latestRelease.adminTabs?.[0]?.schema;
  const previewScale = compact
    ? 'w-[460%] scale-[0.2]'
    : 'w-[380%] scale-[0.24]';

  if (plugin.iconUrl) {
    return (
      <img
        src={plugin.iconUrl}
        alt={`${plugin.title} icon`}
        className={`${iconSize} pointer-events-none rounded-[20%] object-cover`}
      />
    );
  }

  if (!previewSchema) {
    return (
      <div
        className={`${iconSize} pointer-events-none flex items-center justify-center rounded-[20%] bg-[#f1f3f4] text-[9px] font-semibold uppercase tracking-[0.08em] text-[#5f6368]`}
      >
        No UI
      </div>
    );
  }

  return (
    <div
      className={`${iconSize} pointer-events-none overflow-hidden rounded-[20%] border border-[#dadce0] bg-[#f8f9fa]`}
    >
      <div className={`${previewScale} origin-top-left`}>
        <AutoTable<SchemaKeys>
          schema={previewSchema as SchemaKeys}
          data={[]}
          readOnly
          enableAdvancedFiltering={false}
          enableAdvancedSorting={false}
          enableAggregations={false}
          enableColumnPinning={false}
          enableRowSelection={false}
          enableGlobalFiltering={false}
          enablePagination={false}
          defaultPageSize={3}
          className="min-h-0"
        />
      </div>
    </div>
  );
}
