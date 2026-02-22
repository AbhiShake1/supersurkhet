import type { SchemaKeys } from '@gta/react-hooks';
import { get as ssrGet } from '@/lib/gun/ssr/get';
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
      ssrGet('businessPluginInstall', businessId),
      ssrGet('pluginRelease'),
      ssrGet('businessPluginDraftInstall', businessId),
      ssrGet('pluginDraftRevision'),
    ]);
  const installs = installRows as BusinessPluginInstallDoc[];
  const releases = releaseRows as PluginReleaseDoc[];
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
