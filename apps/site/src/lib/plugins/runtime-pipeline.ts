import { SSRGetTimeoutError, get as ssrGet } from '@/lib/gun/ssr/get';
import { mergeMarketplaceReleasesWithSeed } from '@/lib/plugins/marketplace-seed';
import { createPluginRuntimeRegistry } from '@/lib/plugins/runtime-registry';
import type {
  BusinessPluginDraftInstallDoc,
  BusinessPluginInstallDoc,
  LifecycleHook,
  PluginDraftRevisionDoc,
  PluginReleaseDoc,
  RuntimeActionHandlers,
} from '@/lib/plugins/types';
import { executeLifecycleHook } from '@/lib/plugins/workflow-executor';

const runtimeActionHandlers: RuntimeActionHandlers = {};

export function registerRuntimeActionHandlers(handlers: RuntimeActionHandlers) {
  Object.assign(runtimeActionHandlers, handlers);
}

export async function runLifecycleHookPipeline({
  businessId,
  teamId,
  table,
  hook,
  payload,
}: {
  businessId?: string;
  teamId?: string;
  table: string;
  hook: LifecycleHook;
  payload: unknown;
}) {
  if (!businessId) return;

  const [installRows, releaseRows, draftInstallRows, draftRevisionRows] =
    await Promise.all([
      readRowsWithTimeoutFallback(() =>
        ssrGet('businessPluginInstall', businessId),
      ),
      readRowsWithTimeoutFallback(() => ssrGet('pluginRelease')),
      readRowsWithTimeoutFallback(() =>
        ssrGet('businessPluginDraftInstall', businessId),
      ),
      readRowsWithTimeoutFallback(() => ssrGet('pluginDraftRevision')),
    ]);
  const installs = installRows as BusinessPluginInstallDoc[];
  const releases = mergeMarketplaceReleasesWithSeed(
    releaseRows as PluginReleaseDoc[],
  );
  const draftInstalls = draftInstallRows as BusinessPluginDraftInstallDoc[];
  const draftRevisions = draftRevisionRows as PluginDraftRevisionDoc[];
  const registry = createPluginRuntimeRegistry({
    installs,
    releases,
    draftInstalls,
    draftRevisions,
  });

  await executeLifecycleHook({
    registry,
    businessId,
    teamId,
    table,
    hook,
    payload,
    actionHandlers: runtimeActionHandlers,
  });
}

async function readRowsWithTimeoutFallback<T>(
  reader: () => Promise<T[]>,
): Promise<T[]> {
  try {
    return await reader();
  } catch (error) {
    if (isSSRGetTimeoutError(error)) {
      return [];
    }
    throw error;
  }
}

function isSSRGetTimeoutError(error: unknown): boolean {
  if (error instanceof SSRGetTimeoutError) return true;
  if (typeof error === 'string') return error.includes('fetch timed out');
  if (!error || typeof error !== 'object') return false;

  const candidate = error as {
    name?: unknown;
    message?: unknown;
    cause?: unknown;
  };

  if (candidate.name === 'SSRGetTimeoutError') return true;
  if (
    typeof candidate.message === 'string' &&
    candidate.message.includes('fetch timed out')
  ) {
    return true;
  }

  return isSSRGetTimeoutError(candidate.cause);
}
