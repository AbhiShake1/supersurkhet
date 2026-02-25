import type { PluginRuntimeRegistry } from '@/lib/plugins/runtime-registry';
import type { BusinessPluginInstallDoc } from '@/lib/plugins/types';
import type {
  RollbackExecutionFailureDoc,
  RollbackExecutionStepResultDoc,
} from './rollback-health-verify';

export type PluginInstallRollbackSnapshotDoc = {
  snapshotId: string;
  businessId: string;
  pluginId: string;
  expectedCurrent?: Pick<
    BusinessPluginInstallDoc,
    'version' | 'manifestHash' | 'artifactHash'
  >;
  targetInstall?: BusinessPluginInstallDoc;
};

function normalizeInstallForCompare(
  install: BusinessPluginInstallDoc | undefined,
): string | undefined {
  if (!install) {
    return undefined;
  }
  return JSON.stringify({
    businessId: install.businessId,
    pluginId: install.pluginId,
    version: install.version,
    manifestHash: install.manifestHash,
    artifactHash: install.artifactHash,
    status: install.status,
  });
}

export function executePluginInstallRollback(input: {
  stepId?: string;
  registry: PluginRuntimeRegistry;
  snapshot: PluginInstallRollbackSnapshotDoc;
}): RollbackExecutionStepResultDoc {
  const stepId = input.stepId ?? `plugin-install:${input.snapshot.snapshotId}`;
  const failureReasons: RollbackExecutionFailureDoc[] = [];

  const currentInstall = input.registry.getInstalledReleaseForBusiness({
    businessId: input.snapshot.businessId,
    pluginId: input.snapshot.pluginId,
  });
  const currentSummary = normalizeInstallForCompare(currentInstall);
  const targetSummary = normalizeInstallForCompare(
    input.snapshot.targetInstall,
  );

  if (input.snapshot.expectedCurrent) {
    const expectedSummary = JSON.stringify({
      businessId: input.snapshot.businessId,
      pluginId: input.snapshot.pluginId,
      version: input.snapshot.expectedCurrent.version,
      manifestHash: input.snapshot.expectedCurrent.manifestHash,
      artifactHash: input.snapshot.expectedCurrent.artifactHash,
      status: currentInstall?.status ?? 'active',
    });
    if (currentSummary !== expectedSummary) {
      return {
        stepId,
        target: 'plugin-install-state',
        status: 'failed',
        failureReasons: [
          {
            code: 'precondition_mismatch',
            message:
              'Current plugin install does not match snapshot precondition; refusing rollback write.',
            recoverable: true,
          },
        ],
        details: {
          businessId: input.snapshot.businessId,
          pluginId: input.snapshot.pluginId,
        },
      };
    }
  }

  if (currentSummary === targetSummary) {
    return {
      stepId,
      target: 'plugin-install-state',
      status: 'noop',
      failureReasons,
      details: {
        businessId: input.snapshot.businessId,
        pluginId: input.snapshot.pluginId,
      },
    };
  }

  if (!input.snapshot.targetInstall) {
    return {
      stepId,
      target: 'plugin-install-state',
      status: 'failed',
      failureReasons: [
        {
          code: 'missing_uninstall_capability',
          message:
            'Rollback target is an uninstalled state, but registry adapter does not support uninstall.',
          recoverable: false,
        },
      ],
      details: {
        businessId: input.snapshot.businessId,
        pluginId: input.snapshot.pluginId,
      },
    };
  }

  const targetInstall = input.snapshot.targetInstall;
  const release = input.registry.getRelease({
    pluginId: targetInstall.pluginId,
    version: targetInstall.version,
  });

  if (!release) {
    return {
      stepId,
      target: 'plugin-install-state',
      status: 'failed',
      failureReasons: [
        {
          code: 'release_not_found',
          message: `Cannot rollback ${targetInstall.pluginId} to ${targetInstall.version}; release is missing from registry.`,
          recoverable: true,
        },
      ],
      details: {
        businessId: input.snapshot.businessId,
        pluginId: input.snapshot.pluginId,
        version: targetInstall.version,
      },
    };
  }

  try {
    input.registry.installRelease(targetInstall, {
      explicitOwnerUpdate: true,
    });
    return {
      stepId,
      target: 'plugin-install-state',
      status: 'succeeded',
      failureReasons: [],
      details: {
        businessId: input.snapshot.businessId,
        pluginId: input.snapshot.pluginId,
        version: targetInstall.version,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Unknown plugin install rollback failure.';
    return {
      stepId,
      target: 'plugin-install-state',
      status: 'failed',
      failureReasons: [
        {
          code: 'install_write_failed',
          message,
          recoverable: true,
        },
      ],
      details: {
        businessId: input.snapshot.businessId,
        pluginId: input.snapshot.pluginId,
        version: targetInstall.version,
      },
    };
  }
}
