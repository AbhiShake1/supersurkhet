import type { SchemaKeys } from '@gta/react-hooks';
import { useMemo } from 'react';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import { api } from '@/lib/api';
import { mergeMarketplaceReleasesWithSeed } from '@/lib/plugins/marketplace-seed';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';
import {
  resolveInstallDrivenSubdomainGuardRule,
  resolveInstallDrivenSubdomains,
  resolveInstallDrivenSubdomainUiLayers,
  resolveInstallDrivenTabs,
} from './business-config-resolver';

type AnyAutoTableTab = {
  schema: SchemaKeys;
  slug: string;
  title?: string;
  group?: string;
};

type JsonRecord = Record<string, unknown>;
type BindingCarrierKey = 'bindings' | 'tabBindings';
type DataScopeCarrierKey = 'dataScopes' | 'tabDataScopes';

export type AutoAdminRootFocusedConfig = {
  tabs: unknown[];
  bindings: JsonRecord;
  systemTabs: JsonRecord;
  dataScopes: JsonRecord;
  bindingCarrierKeys: BindingCarrierKey[];
  dataScopeCarrierKeys: DataScopeCarrierKey[];
};

export type AutoAdminRootFocusedConfigPatch = Partial<{
  tabs: unknown[];
  bindings: JsonRecord;
  systemTabs: JsonRecord;
  dataScopes: JsonRecord;
}>;

function isJsonRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return undefined;
  }
}

function toArrayValue(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseJson(value);
    if (Array.isArray(parsed)) return parsed;
  }
  return [];
}

function toRecordValue(value: unknown): JsonRecord {
  if (isJsonRecord(value)) return value;
  if (typeof value === 'string') {
    const parsed = parseJson(value);
    if (isJsonRecord(parsed)) return parsed;
  }
  return {};
}

function resolveBindingCarrierKeys(
  props: Record<string, unknown>,
): BindingCarrierKey[] {
  const keys = (['bindings', 'tabBindings'] as const).filter((key) =>
    Object.hasOwn(props, key),
  );
  return keys.length > 0 ? [...keys] : ['bindings'];
}

function resolveDataScopeCarrierKeys(
  props: Record<string, unknown>,
): DataScopeCarrierKey[] {
  const keys = (['dataScopes', 'tabDataScopes'] as const).filter((key) =>
    Object.hasOwn(props, key),
  );
  return keys.length > 0 ? [...keys] : ['dataScopes'];
}

function toCarrierValue(
  existingValue: unknown,
  nextValue: unknown[] | JsonRecord,
): unknown {
  if (typeof existingValue === 'string') {
    return JSON.stringify(nextValue);
  }
  return nextValue;
}

export function readAutoAdminRootFocusedConfig(
  props: Record<string, unknown>,
): AutoAdminRootFocusedConfig {
  const bindingCarrierKeys = resolveBindingCarrierKeys(props);
  const dataScopeCarrierKeys = resolveDataScopeCarrierKeys(props);
  const bindings: JsonRecord = {};
  for (const key of bindingCarrierKeys) {
    Object.assign(bindings, toRecordValue(props[key]));
  }
  const dataScopes: JsonRecord = {};
  for (const key of dataScopeCarrierKeys) {
    Object.assign(dataScopes, toRecordValue(props[key]));
  }

  return {
    tabs: toArrayValue(props.tabs),
    bindings,
    systemTabs: toRecordValue(props.systemTabs),
    dataScopes,
    bindingCarrierKeys,
    dataScopeCarrierKeys,
  };
}

export function applyAutoAdminRootFocusedConfigPatch(
  props: Record<string, unknown>,
  patch: AutoAdminRootFocusedConfigPatch,
): Record<string, unknown> {
  const nextProps = { ...props };
  const focusedConfig = readAutoAdminRootFocusedConfig(props);

  if (patch.tabs) {
    nextProps.tabs = toCarrierValue(props.tabs, patch.tabs);
  }

  if (patch.systemTabs) {
    nextProps.systemTabs = toCarrierValue(props.systemTabs, patch.systemTabs);
  }

  if (patch.bindings) {
    for (const key of focusedConfig.bindingCarrierKeys) {
      nextProps[key] = toCarrierValue(props[key], patch.bindings);
    }
  }

  if (patch.dataScopes) {
    for (const key of focusedConfig.dataScopeCarrierKeys) {
      nextProps[key] = toCarrierValue(props[key], patch.dataScopes);
    }
  }

  return nextProps;
}

type UseBusinessConfigInput = {
  slug: string;
  businessId?: string;
};

type UseBusinessConfigState = {
  tabs: AnyAutoTableTab[];
  isLoading: boolean;
};

type UseBusinessSubdomainLayersInput = {
  slug: string;
  subdomain: string;
  businessId?: string;
};

type UseBusinessSubdomainLayersState = {
  layers: ComponentLayer[] | null;
  guardRule: 'authenticated-user' | 'organization-member' | null;
  isLoading: boolean;
};

type UseBusinessSubdomainsInput = {
  slug: string;
  businessId?: string;
};

type UseBusinessSubdomainsState = {
  subdomains: string[];
  isLoading: boolean;
};

export function useBusinessConfigState({
  slug,
  businessId,
}: UseBusinessConfigInput): UseBusinessConfigState {
  const scopedBusinessId = businessId ?? slug;
  const installRowsQuery = api.businessPluginInstall.useGet({
    keys: [scopedBusinessId],
  });
  const releaseRowsQuery = api.pluginRelease.useGet();
  const installs = (installRowsQuery.data ?? []) as BusinessPluginInstallDoc[];
  const releases = useMemo(
    () =>
      mergeMarketplaceReleasesWithSeed(
        (releaseRowsQuery.data ?? []) as PluginReleaseDoc[],
      ),
    [releaseRowsQuery.data],
  );
  const tabs = resolveInstallDrivenTabs({
    businessId: scopedBusinessId,
    businessSlug: slug,
    installs,
    releases,
  });
  const isInitialLoadPending =
    !installRowsQuery.isFetched || !releaseRowsQuery.isFetched;
  const isEmptyConfigRefetching =
    tabs.length === 0 &&
    (installRowsQuery.isFetching || releaseRowsQuery.isFetching);

  return {
    tabs,
    isLoading: isInitialLoadPending || isEmptyConfigRefetching,
  };
}

export function useBusinessConfig(
  input: UseBusinessConfigInput,
): AnyAutoTableTab[] {
  return useBusinessConfigState(input).tabs;
}

export function useBusinessSubdomainLayersState({
  slug,
  subdomain,
  businessId,
}: UseBusinessSubdomainLayersInput): UseBusinessSubdomainLayersState {
  const scopedBusinessId = businessId ?? slug;
  const installRowsQuery = api.businessPluginInstall.useGet({
    keys: [scopedBusinessId],
  });
  const releaseRowsQuery = api.pluginRelease.useGet();
  const installs = (installRowsQuery.data ?? []) as BusinessPluginInstallDoc[];
  const releases = useMemo(
    () =>
      mergeMarketplaceReleasesWithSeed(
        (releaseRowsQuery.data ?? []) as PluginReleaseDoc[],
      ),
    [releaseRowsQuery.data],
  );
  const layers = resolveInstallDrivenSubdomainUiLayers({
    businessId: scopedBusinessId,
    subdomain,
    installs,
    releases,
  });
  const guardRule = resolveInstallDrivenSubdomainGuardRule({
    businessId: scopedBusinessId,
    subdomain,
    installs,
    releases,
  });
  const isInitialLoadPending =
    !installRowsQuery.isFetched || !releaseRowsQuery.isFetched;

  return {
    layers,
    guardRule,
    isLoading: isInitialLoadPending,
  };
}

export function useBusinessSubdomainsState({
  slug,
  businessId,
}: UseBusinessSubdomainsInput): UseBusinessSubdomainsState {
  const scopedBusinessId = businessId ?? slug;
  const installRowsQuery = api.businessPluginInstall.useGet({
    keys: [scopedBusinessId],
  });
  const releaseRowsQuery = api.pluginRelease.useGet();
  const installs = (installRowsQuery.data ?? []) as BusinessPluginInstallDoc[];
  const releases = useMemo(
    () =>
      mergeMarketplaceReleasesWithSeed(
        (releaseRowsQuery.data ?? []) as PluginReleaseDoc[],
      ),
    [releaseRowsQuery.data],
  );
  const subdomains = resolveInstallDrivenSubdomains({
    businessId: scopedBusinessId,
    installs,
    releases,
  });
  const isInitialLoadPending =
    !installRowsQuery.isFetched || !releaseRowsQuery.isFetched;

  return {
    subdomains,
    isLoading: isInitialLoadPending,
  };
}
