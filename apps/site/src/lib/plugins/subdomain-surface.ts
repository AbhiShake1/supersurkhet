import type { PluginReleaseDoc } from '@/lib/plugins/types';

const SUBDOMAIN_SENTINEL_PREFIX = '__plugin_studio_subdomain__/';
const SUBDOMAIN_UI_SENTINEL_PREFIX = '__plugin_studio_subdomain_ui__/';
const SUBDOMAIN_GUARD_SENTINEL_PREFIX = '__plugin_studio_subdomain_guard__/';
const SYSTEM_SENTINEL_PREFIX = '__plugin_studio_';

type JsonRecord = Record<string, unknown>;

export type PluginSubdomainSurface = {
  subdomain: string;
  label: string;
  uiLayers: unknown[] | null;
  imageUrls: string[];
};

export type SubdomainAccessRule = 'authenticated-user' | 'organization-member';

function normalizeSubdomainName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'index';
}

function toSubdomainLabel(subdomain: string): string {
  return subdomain
    .split('-')
    .filter(Boolean)
    .map((part) => `${part[0]?.toUpperCase() ?? ''}${part.slice(1)}`)
    .join(' ');
}

function parseJsonArrayOrNull(value: unknown): unknown[] | null {
  if (Array.isArray(value)) return value;
  if (typeof value !== 'string') return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function normalizeSubdomainAccessRule(
  value: unknown,
): SubdomainAccessRule | null {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  if (
    normalized === 'authenticated-user' ||
    normalized === 'organization-member'
  ) {
    return normalized;
  }
  return null;
}

function isLikelyImageValue(
  key: string | null,
  value: unknown,
): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (
    !trimmed.startsWith('http://') &&
    !trimmed.startsWith('https://') &&
    !trimmed.startsWith('/')
  ) {
    return false;
  }
  const lowerKey = (key ?? '').toLowerCase();
  if (lowerKey.length === 0) return false;
  return /(src|image|icon|poster|thumbnail|avatar|screenshot)/.test(lowerKey);
}

function collectImageUrlsFromJson(value: unknown, urls: Set<string>) {
  if (Array.isArray(value)) {
    for (const entry of value) {
      collectImageUrlsFromJson(entry, urls);
    }
    return;
  }

  if (!value || typeof value !== 'object') {
    return;
  }

  const record = value as JsonRecord;
  for (const [key, candidate] of Object.entries(record)) {
    if (isLikelyImageValue(key, candidate)) {
      urls.add(candidate.trim());
      continue;
    }
    collectImageUrlsFromJson(candidate, urls);
  }
}

export function toAdminFallbackUiLayers(subdomain = 'admin'): unknown[] {
  return [
    {
      id: `${subdomain}-page-root`,
      name: `${subdomain} page`,
      type: 'div',
      props: {
        className: 'min-h-svh w-full bg-background text-foreground',
      },
      children: [
        {
          id: `${subdomain}-auto-admin`,
          name: 'Auto Admin',
          type: 'AutoAdmin',
          props: {},
          children: [],
        },
      ],
    },
  ];
}

export function resolveReleaseSubdomainSurface(
  release: Pick<PluginReleaseDoc, 'adminTabs'>,
  options?: {
    ensureDefaultSubdomains?: boolean;
    includeAdminFallbackLayers?: boolean;
  },
): {
  subdomains: string[];
  surfaces: PluginSubdomainSurface[];
  uiLayersBySubdomain: Record<string, unknown[]>;
  imageUrlsBySubdomain: Record<string, string[]>;
  accessRuleBySubdomain: Record<string, SubdomainAccessRule>;
} {
  const ensureDefaultSubdomains = options?.ensureDefaultSubdomains ?? true;
  const includeAdminFallbackLayers =
    options?.includeAdminFallbackLayers ?? true;

  const adminTabs = release.adminTabs ?? [];
  const orderedSubdomains: string[] = [];
  const subdomainSet = new Set<string>();
  const uiLayersBySubdomain = new Map<string, unknown[]>();
  const accessRuleBySubdomain = new Map<string, SubdomainAccessRule>();

  for (const tab of adminTabs) {
    const schema = tab.schema?.trim();
    if (!schema) continue;

    if (schema.startsWith(SUBDOMAIN_SENTINEL_PREFIX)) {
      const candidate = schema.slice(SUBDOMAIN_SENTINEL_PREFIX.length).trim();
      const normalized = normalizeSubdomainName(candidate);
      if (!subdomainSet.has(normalized)) {
        orderedSubdomains.push(normalized);
        subdomainSet.add(normalized);
      }
      continue;
    }

    if (schema.startsWith(SUBDOMAIN_UI_SENTINEL_PREFIX)) {
      const candidate = schema
        .slice(SUBDOMAIN_UI_SENTINEL_PREFIX.length)
        .trim();
      const normalized = normalizeSubdomainName(candidate);
      const parsedLayers = parseJsonArrayOrNull(tab.title);
      if (parsedLayers && parsedLayers.length > 0) {
        uiLayersBySubdomain.set(normalized, parsedLayers);
        if (!subdomainSet.has(normalized)) {
          orderedSubdomains.push(normalized);
          subdomainSet.add(normalized);
        }
      }
    }

    if (schema.startsWith(SUBDOMAIN_GUARD_SENTINEL_PREFIX)) {
      const candidate = schema
        .slice(SUBDOMAIN_GUARD_SENTINEL_PREFIX.length)
        .trim();
      const normalized = normalizeSubdomainName(candidate);
      const accessRule = normalizeSubdomainAccessRule(tab.title);
      if (accessRule) {
        accessRuleBySubdomain.set(normalized, accessRule);
      }
      if (!subdomainSet.has(normalized)) {
        orderedSubdomains.push(normalized);
        subdomainSet.add(normalized);
      }
    }
  }

  if (ensureDefaultSubdomains) {
    for (const fallbackSubdomain of ['index', 'admin']) {
      if (!subdomainSet.has(fallbackSubdomain)) {
        orderedSubdomains.push(fallbackSubdomain);
        subdomainSet.add(fallbackSubdomain);
      }
    }
  }

  if (
    includeAdminFallbackLayers &&
    subdomainSet.has('admin') &&
    !uiLayersBySubdomain.has('admin')
  ) {
    uiLayersBySubdomain.set('admin', toAdminFallbackUiLayers('admin'));
  }

  const imageUrlsBySubdomain: Record<string, string[]> = {};
  const surfaces: PluginSubdomainSurface[] = orderedSubdomains.map(
    (subdomain) => {
      const uiLayers = uiLayersBySubdomain.get(subdomain) ?? null;
      const imageUrls = new Set<string>();
      collectImageUrlsFromJson(uiLayers, imageUrls);
      const urls = [...imageUrls];
      imageUrlsBySubdomain[subdomain] = urls;
      return {
        subdomain,
        label: toSubdomainLabel(subdomain),
        uiLayers,
        imageUrls: urls,
      };
    },
  );

  const uiLayersRecord: Record<string, unknown[]> = {};
  for (const [subdomain, layers] of uiLayersBySubdomain.entries()) {
    uiLayersRecord[subdomain] = layers;
  }
  const accessRuleRecord: Record<string, SubdomainAccessRule> = {};
  for (const [subdomain, accessRule] of accessRuleBySubdomain.entries()) {
    accessRuleRecord[subdomain] = accessRule;
  }

  return {
    subdomains: orderedSubdomains,
    surfaces,
    uiLayersBySubdomain: uiLayersRecord,
    imageUrlsBySubdomain,
    accessRuleBySubdomain: accessRuleRecord,
  };
}

export function resolveSubdomainsWithAttachedUiLayers(
  release: Pick<PluginReleaseDoc, 'adminTabs'>,
): string[] {
  const adminTabs = release.adminTabs ?? [];
  const attached: string[] = [];
  const seen = new Set<string>();

  for (const tab of adminTabs) {
    const schema = tab.schema?.trim();
    if (!schema || !schema.startsWith(SUBDOMAIN_UI_SENTINEL_PREFIX)) continue;
    const candidate = schema.slice(SUBDOMAIN_UI_SENTINEL_PREFIX.length).trim();
    if (!candidate) continue;
    const normalized = normalizeSubdomainName(candidate);
    const parsedLayers = parseJsonArrayOrNull(tab.title);
    if (!parsedLayers || parsedLayers.length === 0) continue;
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    attached.push(normalized);
  }

  return attached;
}

export function isPluginSystemSentinelSchema(schema: string): boolean {
  return schema.trim().startsWith(SYSTEM_SENTINEL_PREFIX);
}
