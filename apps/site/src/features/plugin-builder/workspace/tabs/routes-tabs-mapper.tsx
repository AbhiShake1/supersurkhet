import {
  Folder,
  List,
  MapIcon,
  Package,
  type LucideIcon,
  ShoppingCart,
  Users,
} from 'lucide-react';

export type RoutesTabsTabInput = {
  id?: `tab_${string}` | string;
  schema: string;
  title?: string;
  group?: string;
  icon?: string;
  route?: string;
  order?: number;
};

export type RoutesTabsMapperInput = {
  businessSlug: string;
  tabs: readonly RoutesTabsTabInput[];
  iconRegistry?: Record<string, LucideIcon>;
};

export type RoutesTabsMappedRoute = {
  id: string;
  schema: string;
  title: string;
  group?: string;
  order: number;
  routeSegment: string;
  routePath: string;
  icon?: LucideIcon;
  iconName?: string;
};

export type RoutesTabsMapperDiagnostic = {
  code: 'duplicate-route' | 'invalid-icon';
  message: string;
  path: string[];
};

export type RoutesTabsMapperResult = {
  routes: RoutesTabsMappedRoute[];
  diagnostics: RoutesTabsMapperDiagnostic[];
};

const DEFAULT_ORDER = Number.MAX_SAFE_INTEGER;

export const DEFAULT_TAB_ICON_REGISTRY: Record<string, LucideIcon> = {
  Package,
  Users,
  ShoppingCart,
  Folder,
  List,
  MapIcon,
};

export function mapRoutesTabsToAutoAdminConfig(
  input: RoutesTabsMapperInput,
): RoutesTabsMapperResult {
  const iconRegistry = {
    ...DEFAULT_TAB_ICON_REGISTRY,
    ...(input.iconRegistry ?? {}),
  };

  const diagnostics: RoutesTabsMapperDiagnostic[] = [];
  const normalizedBasePath = normalizeBasePath(input.businessSlug);

  const sortable = input.tabs.map((tab, index) => {
    const id = tab.id ?? `tab_${tab.schema}`;
    const title = (tab.title ?? toTitleCase(tab.schema)).trim();
    const group = tab.group?.trim() || undefined;
    const order = Number.isFinite(tab.order) ? Number(tab.order) : DEFAULT_ORDER;
    const routeSegment = normalizeRouteSegment(tab.route ?? tab.schema);
    const routePath = joinRoutePath(normalizedBasePath, routeSegment);

    let icon: LucideIcon | undefined;
    let iconName: string | undefined;

    if (tab.icon?.trim()) {
      const selectedIconName = tab.icon.trim();
      const selectedIcon = iconRegistry[selectedIconName];
      if (!selectedIcon) {
        diagnostics.push({
          code: 'invalid-icon',
          message: `Unknown icon "${selectedIconName}" for tab ${id}`,
          path: ['tabs', id, 'icon'],
        });
      } else {
        icon = selectedIcon;
        iconName = selectedIconName;
      }
    }

    return {
      index,
      mapped: {
        id,
        schema: tab.schema,
        title,
        group,
        order,
        routeSegment,
        routePath,
        icon,
        iconName,
      } satisfies RoutesTabsMappedRoute,
    };
  });

  const ordered = [...sortable].sort((left, right) => {
    const orderCmp = left.mapped.order - right.mapped.order;
    if (orderCmp !== 0) return orderCmp;
    const groupCmp = compareNullable(left.mapped.group, right.mapped.group);
    if (groupCmp !== 0) return groupCmp;
    const titleCmp = left.mapped.title.localeCompare(right.mapped.title);
    if (titleCmp !== 0) return titleCmp;
    const schemaCmp = left.mapped.schema.localeCompare(right.mapped.schema);
    if (schemaCmp !== 0) return schemaCmp;
    return left.index - right.index;
  });

  const usedRoutePaths = new Set<string>();
  const routes: RoutesTabsMappedRoute[] = [];

  for (const entry of ordered) {
    const collisionKey = entry.mapped.routePath.toLowerCase();
    if (usedRoutePaths.has(collisionKey)) {
      diagnostics.push({
        code: 'duplicate-route',
        message: `Route collision for path ${entry.mapped.routePath}`,
        path: ['tabs', entry.mapped.id, 'route'],
      });
      continue;
    }

    usedRoutePaths.add(collisionKey);
    routes.push(entry.mapped);
  }

  return {
    routes,
    diagnostics,
  };
}

export function toDeterministicRoutesTabsSnapshot(
  routes: readonly RoutesTabsMappedRoute[],
) {
  return [...routes]
    .map((route) => ({
      schema: route.schema,
      title: route.title,
      group: route.group,
      order: route.order,
      routePath: route.routePath,
      iconName: route.iconName,
    }))
    .sort((left, right) => {
      const orderCmp = left.order - right.order;
      if (orderCmp !== 0) return orderCmp;
      const groupCmp = compareNullable(left.group, right.group);
      if (groupCmp !== 0) return groupCmp;
      const titleCmp = left.title.localeCompare(right.title);
      if (titleCmp !== 0) return titleCmp;
      return left.schema.localeCompare(right.schema);
    });
}

export type RoutesTabsMapperTabProps = {
  result: RoutesTabsMapperResult;
};

export function RoutesTabsMapperTab({ result }: RoutesTabsMapperTabProps) {
  return (
    <section aria-label="Routes and tabs mapper tab">
      <h2>Routes &amp; Tabs</h2>

      <article>
        <h3>Mapped Routes</h3>
        {result.routes.length === 0 ? (
          <p>No routes configured</p>
        ) : (
          <ul>
            {result.routes.map((route) => (
              <li key={route.id}>
                <span>{route.title}</span> <span>{route.routePath}</span>{' '}
                <span>{route.group ?? 'Ungrouped'}</span>
              </li>
            ))}
          </ul>
        )}
      </article>

      <article>
        <h3>Diagnostics</h3>
        {result.diagnostics.length === 0 ? (
          <p>No route mapping issues detected</p>
        ) : (
          <ul>
            {result.diagnostics.map((diagnostic) => (
              <li key={`${diagnostic.code}:${diagnostic.path.join('.')}`}>
                {diagnostic.code}: {diagnostic.message}
              </li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}

function normalizeBasePath(slug: string): string {
  const parts = slug
    .split('/')
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => normalizeRouteSegment(part));

  return parts.join('/');
}

function normalizeRouteSegment(route: string): string {
  const parts = route
    .split('/')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
    .map((part) =>
      part
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, ''),
    )
    .filter(Boolean);

  if (parts.length === 0) {
    return 'untitled';
  }

  return parts.join('/');
}

function joinRoutePath(basePath: string, routeSegment: string): string {
  if (!basePath) {
    return `/${routeSegment}`;
  }
  return `/${basePath}/${routeSegment}`;
}

function compareNullable(left?: string, right?: string): number {
  const leftValue = left ?? '';
  const rightValue = right ?? '';
  return leftValue.localeCompare(rightValue);
}

function toTitleCase(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (char) => char.toUpperCase());
}
