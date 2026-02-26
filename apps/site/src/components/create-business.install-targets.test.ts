import { describe, expect, it } from 'vitest';
import { toInstallTargets } from '@/lib/plugins/business-install-targets';
import type { PluginReleaseDoc } from '@/lib/plugins/types';

function release(
  id: string,
  capabilitiesByAction: string[][],
): PluginReleaseDoc {
  const [pluginId, version = '1.0.0'] = id.split('@');
  return {
    id,
    pluginId: pluginId ?? id,
    version,
    manifestHash: 'manifest-hash',
    artifactHash: 'artifact-hash',
    author: { userId: 'test-user' },
    visibility: 'public',
    actionManifest: capabilitiesByAction.map((capabilities, index) => ({
      actionId: `action-${index}`,
      runtime: 'sandbox-worker',
      capabilities,
    })),
    publishedAt: '2026-01-01T00:00:00.000Z',
  };
}

describe('toInstallTargets', () => {
  it('adds requestedCapabilities from release action manifest', () => {
    const releasesById = new Map<string, PluginReleaseDoc>([
      [
        'acme.inventory@1.0.0',
        release('acme.inventory@1.0.0', [
          ['inventory:write', 'inventory:read'],
          ['inventory:read', 'catalog:write'],
        ]),
      ],
    ]);

    const targets = toInstallTargets(['acme.inventory@1.0.0'], releasesById);

    expect(targets).toEqual([
      {
        pluginId: 'acme.inventory',
        version: '1.0.0',
        requestedCapabilities: [
          'inventory:write',
          'inventory:read',
          'catalog:write',
        ],
      },
    ]);
  });

  it('keeps the most recent selected version per plugin', () => {
    const releasesById = new Map<string, PluginReleaseDoc>([
      [
        'acme.inventory@1.0.0',
        release('acme.inventory@1.0.0', [['inventory:v1']]),
      ],
      [
        'acme.inventory@2.0.0',
        release('acme.inventory@2.0.0', [['inventory:v2']]),
      ],
    ]);

    const targets = toInstallTargets(
      ['acme.inventory@1.0.0', 'acme.inventory@2.0.0'],
      releasesById,
    );

    expect(targets).toEqual([
      {
        pluginId: 'acme.inventory',
        version: '2.0.0',
        requestedCapabilities: ['inventory:v2'],
      },
    ]);
  });
});
