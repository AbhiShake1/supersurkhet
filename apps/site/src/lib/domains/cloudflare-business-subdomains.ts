import type {
  AdminTabDoc,
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';

const SUBDOMAIN_SENTINEL_PREFIX = '__plugin_studio_subdomain__/';
const DNS_SENTINEL_SCHEMA_ID = '__plugin_studio_dns__/cloudflare';
const MANAGED_COMMENT_PREFIX = 'supersurkhet-managed-dns';

type CloudflareDnsRecord = {
  id: string;
  type: string;
  name: string;
  content: string;
  proxied?: boolean;
  ttl?: number;
  comment?: string;
};

type CloudflareListResponse = {
  result: CloudflareDnsRecord[];
  result_info?: {
    page?: number;
    per_page?: number;
    total_pages?: number;
  };
  success: boolean;
  errors: Array<{ message?: string }>;
};

type CloudflareSingleResponse = {
  result: CloudflareDnsRecord;
  success: boolean;
  errors: Array<{ message?: string }>;
};

type CloudflareConfig = {
  apiToken: string;
  zoneId: string;
  baseDomain: string;
  dnsTarget: string;
  recordType: 'CNAME';
  proxied: boolean;
};

export type BusinessDnsSyncResult = {
  status: 'applied' | 'skipped' | 'failed';
  reason?: string;
  created: string[];
  updated: string[];
  deleted: string[];
  skippedHosts: string[];
  desiredHosts: string[];
};

type ReleaseDnsProjection = {
  autoConfigureDns: boolean;
  subdomains: string[];
};

function normalizeSubdomainName(value: string): string {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return normalized || 'index';
}

function toManagedCommentTag(businessSlug: string): string {
  return `${MANAGED_COMMENT_PREFIX}:${businessSlug}`;
}

function toCloudflareConfig():
  | { ok: true; value: CloudflareConfig }
  | {
      ok: false;
      reason: string;
    } {
  const apiToken = process.env.CLOUDFLARE_API_TOKEN?.trim() ?? '';
  const zoneId = process.env.CLOUDFLARE_ZONE_ID?.trim() ?? '';
  const baseDomain =
    process.env.CLOUDFLARE_BASE_DOMAIN?.trim().toLowerCase() ?? '';
  const dnsTarget = process.env.CLOUDFLARE_DNS_TARGET?.trim() ?? '';
  const missing: string[] = [];

  if (!apiToken) missing.push('CLOUDFLARE_API_TOKEN');
  if (!zoneId) missing.push('CLOUDFLARE_ZONE_ID');
  if (!baseDomain) missing.push('CLOUDFLARE_BASE_DOMAIN');
  if (!dnsTarget) missing.push('CLOUDFLARE_DNS_TARGET');

  if (missing.length > 0) {
    return {
      ok: false,
      reason: `Missing Cloudflare DNS env vars: ${missing.join(', ')}`,
    };
  }

  const proxied =
    (process.env.CLOUDFLARE_DNS_PROXIED ?? 'true').toLowerCase() !== 'false';
  return {
    ok: true,
    value: {
      apiToken,
      zoneId,
      baseDomain,
      dnsTarget,
      recordType: 'CNAME',
      proxied,
    },
  };
}

function collectReleaseDnsProjection(
  adminTabs: readonly AdminTabDoc[] | undefined,
): ReleaseDnsProjection {
  const tabs = adminTabs ?? [];
  const subdomains = new Set<string>();
  let autoConfigureDns = true;

  for (const tab of tabs) {
    const schema = tab?.schema?.trim();
    if (!schema) continue;

    if (schema === DNS_SENTINEL_SCHEMA_ID) {
      autoConfigureDns = (tab.title?.trim() || 'auto') !== 'manual';
      continue;
    }

    if (!schema.startsWith(SUBDOMAIN_SENTINEL_PREFIX)) {
      continue;
    }

    const candidate = schema.slice(SUBDOMAIN_SENTINEL_PREFIX.length).trim();
    if (!candidate) continue;
    subdomains.add(normalizeSubdomainName(candidate));
  }

  return {
    autoConfigureDns,
    subdomains: [...subdomains],
  };
}

export function collectDesiredBusinessSubdomainHosts({
  businessSlug,
  installs,
  releases,
  baseDomain,
}: {
  businessSlug: string;
  installs: readonly BusinessPluginInstallDoc[];
  releases: readonly PluginReleaseDoc[];
  baseDomain: string;
}): string[] {
  const releaseById = new Map(releases.map((release) => [release.id, release]));
  const desiredHosts = new Set<string>();

  for (const install of installs) {
    const release = releaseById.get(`${install.pluginId}@${install.version}`);
    if (!release) continue;
    const projection = collectReleaseDnsProjection(release.adminTabs ?? []);
    if (!projection.autoConfigureDns) continue;

    for (const subdomain of projection.subdomains) {
      const host =
        subdomain === 'index'
          ? `${businessSlug}.${baseDomain}`
          : `${subdomain}.${businessSlug}.${baseDomain}`;
      desiredHosts.add(host.toLowerCase());
    }
  }

  return [...desiredHosts].sort();
}

async function cloudflareRequest<T>(
  config: CloudflareConfig,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(
    `https://api.cloudflare.com/client/v4/zones/${config.zoneId}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
        ...(init?.headers ?? {}),
      },
    },
  );

  const payload = (await response.json()) as {
    success?: boolean;
    errors?: Array<{ message?: string }>;
  };

  if (!response.ok || payload.success === false) {
    const message =
      payload.errors
        ?.map((entry) => entry.message)
        .filter(Boolean)
        .join('; ') || `${response.status} ${response.statusText}`;
    throw new Error(`Cloudflare API request failed: ${message}`);
  }

  return payload as T;
}

async function listRecordsByExactName(
  config: CloudflareConfig,
  name: string,
): Promise<CloudflareDnsRecord[]> {
  const query = new URLSearchParams({
    name,
    per_page: '100',
  });
  const payload = await cloudflareRequest<CloudflareListResponse>(
    config,
    `/dns_records?${query.toString()}`,
    { method: 'GET' },
  );
  return payload.result ?? [];
}

async function listManagedRecordsForBusiness(
  config: CloudflareConfig,
  businessSlug: string,
): Promise<CloudflareDnsRecord[]> {
  const managedCommentTag = toManagedCommentTag(businessSlug);
  const records: CloudflareDnsRecord[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const query = new URLSearchParams({
      per_page: '100',
      page: String(page),
    });
    const payload = await cloudflareRequest<CloudflareListResponse>(
      config,
      `/dns_records?${query.toString()}`,
      { method: 'GET' },
    );
    const currentPageRecords = payload.result ?? [];
    records.push(
      ...currentPageRecords.filter(
        (record) =>
          record.type === config.recordType &&
          record.comment === managedCommentTag &&
          record.name.toLowerCase().endsWith(`.${config.baseDomain}`),
      ),
    );
    totalPages = payload.result_info?.total_pages ?? 1;
    page += 1;
  }

  return records;
}

async function createRecord(
  config: CloudflareConfig,
  name: string,
  comment: string,
): Promise<void> {
  await cloudflareRequest<CloudflareSingleResponse>(config, '/dns_records', {
    method: 'POST',
    body: JSON.stringify({
      type: config.recordType,
      name,
      content: config.dnsTarget,
      proxied: config.proxied,
      ttl: 1,
      comment,
    }),
  });
}

async function updateRecord(
  config: CloudflareConfig,
  recordId: string,
  name: string,
  comment: string,
): Promise<void> {
  await cloudflareRequest<CloudflareSingleResponse>(
    config,
    `/dns_records/${recordId}`,
    {
      method: 'PUT',
      body: JSON.stringify({
        type: config.recordType,
        name,
        content: config.dnsTarget,
        proxied: config.proxied,
        ttl: 1,
        comment,
      }),
    },
  );
}

async function deleteRecord(
  config: CloudflareConfig,
  recordId: string,
): Promise<void> {
  await cloudflareRequest<CloudflareSingleResponse>(
    config,
    `/dns_records/${recordId}`,
    {
      method: 'DELETE',
    },
  );
}

export async function reconcileBusinessSubdomainDnsRecords({
  businessSlug,
  desiredHosts,
}: {
  businessSlug: string;
  desiredHosts: readonly string[];
}): Promise<BusinessDnsSyncResult> {
  const normalizedBusinessSlug = normalizeSubdomainName(businessSlug);
  const configState = toCloudflareConfig();
  if (!configState.ok) {
    return {
      status: 'skipped',
      reason: configState.reason,
      created: [],
      updated: [],
      deleted: [],
      skippedHosts: [],
      desiredHosts: [...desiredHosts],
    };
  }
  const config = configState.value;

  const desiredSet = new Set(
    desiredHosts.map((host) => host.trim().toLowerCase()).filter(Boolean),
  );
  const comment = toManagedCommentTag(normalizedBusinessSlug);

  const created: string[] = [];
  const updated: string[] = [];
  const deleted: string[] = [];
  const skippedHosts: string[] = [];

  for (const host of desiredSet) {
    const exactNameRecords = await listRecordsByExactName(config, host);
    const managedRecord = exactNameRecords.find(
      (record) =>
        record.comment === comment && record.type === config.recordType,
    );

    if (managedRecord) {
      const requiresUpdate =
        managedRecord.content !== config.dnsTarget ||
        managedRecord.proxied !== config.proxied ||
        managedRecord.comment !== comment;
      if (requiresUpdate) {
        await updateRecord(config, managedRecord.id, host, comment);
        updated.push(host);
      }
      continue;
    }

    const conflictingUnmanaged = exactNameRecords.some(
      (record) => record.comment !== comment,
    );
    if (conflictingUnmanaged) {
      skippedHosts.push(host);
      continue;
    }

    await createRecord(config, host, comment);
    created.push(host);
  }

  const managedRecords = await listManagedRecordsForBusiness(
    config,
    normalizedBusinessSlug,
  );
  for (const record of managedRecords) {
    if (desiredSet.has(record.name.toLowerCase())) continue;
    await deleteRecord(config, record.id);
    deleted.push(record.name.toLowerCase());
  }

  return {
    status: 'applied',
    created,
    updated,
    deleted,
    skippedHosts,
    desiredHosts: [...desiredSet].sort(),
  };
}
