import type { RefObject } from 'react';

export const TEMPLATE_FILTER_ALL = 'All';

export type TemplateMarketplaceInstallStateFilter =
  | 'all'
  | 'installed'
  | 'not-installed';

export type TemplateMarketplaceRecencySort = 'newest' | 'oldest';

export type TemplateMarketplaceFiltersState = {
  query: string;
  category: string;
  tag: string;
  installState: TemplateMarketplaceInstallStateFilter;
  recencySort: TemplateMarketplaceRecencySort;
};

export const DEFAULT_TEMPLATE_MARKETPLACE_FILTERS: TemplateMarketplaceFiltersState =
  {
    query: '',
    category: TEMPLATE_FILTER_ALL,
    tag: TEMPLATE_FILTER_ALL,
    installState: 'all',
    recencySort: 'newest',
  };

type TemplateMarketplaceFiltersProps = {
  filters: TemplateMarketplaceFiltersState;
  categories: string[];
  tags: string[];
  searchInputRef?: RefObject<HTMLInputElement | null>;
  onFiltersChange: (next: TemplateMarketplaceFiltersState) => void;
};

function filterChipClassName(active: boolean) {
  return [
    'rounded-md border px-2 py-1 text-xs',
    active ? 'border-primary bg-primary/10 text-primary' : 'border-border',
  ].join(' ');
}

export function TemplateMarketplaceFilters({
  filters,
  categories,
  tags,
  searchInputRef,
  onFiltersChange,
}: TemplateMarketplaceFiltersProps) {
  const setFilter = (patch: Partial<TemplateMarketplaceFiltersState>) => {
    onFiltersChange({
      ...filters,
      ...patch,
    });
  };

  return (
    <div className="space-y-3" data-testid="template-marketplace-filters">
      <input
        ref={searchInputRef}
        value={filters.query}
        onChange={(event) => setFilter({ query: event.target.value })}
        placeholder="Search title, id, category, tags"
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        data-testid="template-marketplace-query"
      />

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Install state</span>
        <button
          type="button"
          onClick={() => setFilter({ installState: 'all' })}
          className={filterChipClassName(filters.installState === 'all')}
        >
          All
        </button>
        <button
          type="button"
          onClick={() => setFilter({ installState: 'installed' })}
          className={filterChipClassName(filters.installState === 'installed')}
        >
          Installed
        </button>
        <button
          type="button"
          onClick={() => setFilter({ installState: 'not-installed' })}
          className={filterChipClassName(
            filters.installState === 'not-installed',
          )}
        >
          Not installed
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Sort</span>
        <button
          type="button"
          onClick={() => setFilter({ recencySort: 'newest' })}
          className={filterChipClassName(filters.recencySort === 'newest')}
        >
          Newest first
        </button>
        <button
          type="button"
          onClick={() => setFilter({ recencySort: 'oldest' })}
          className={filterChipClassName(filters.recencySort === 'oldest')}
        >
          Oldest first
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Category</span>
        <button
          type="button"
          onClick={() => setFilter({ category: TEMPLATE_FILTER_ALL })}
          className={filterChipClassName(
            filters.category === TEMPLATE_FILTER_ALL,
          )}
        >
          All categories
        </button>
        {categories.map((category) => (
          <button
            key={category}
            type="button"
            onClick={() => setFilter({ category })}
            className={filterChipClassName(filters.category === category)}
          >
            {category}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted-foreground">Tag</span>
        <button
          type="button"
          onClick={() => setFilter({ tag: TEMPLATE_FILTER_ALL })}
          className={filterChipClassName(filters.tag === TEMPLATE_FILTER_ALL)}
        >
          All tags
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => setFilter({ tag })}
            className={filterChipClassName(filters.tag === tag)}
          >
            #{tag}
          </button>
        ))}
      </div>
    </div>
  );
}
