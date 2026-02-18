import { describe, expect, it } from 'vitest';
import {
  assertNamespaceHashPinningGuard,
  PluginNamespaceMismatchError,
  PluginSchemaHashMismatchError,
} from '@/lib/plugins/namespace-hash-pinning-guard';

describe('namespace hash pinning guard', () => {
  it('allows operation when namespace and hash pins match active context', () => {
    expect(() =>
      assertNamespaceHashPinningGuard({
        expectedNamespacePath: 'business-1/acme.inventory/inventoryItem/row-1',
        actualNamespacePath: 'business-1/acme.inventory/inventoryItem/row-1',
        context: {
          mode: 'release',
          manifestHash: 'manifest-1',
          artifactHash: 'artifact-1',
        },
        hashPin: {
          manifestHash: 'manifest-1',
        },
      }),
    ).not.toThrow();
  });

  it('rejects stale hash pins with expected and actual hash payload', () => {
    const execute = () =>
      assertNamespaceHashPinningGuard({
        expectedNamespacePath: 'business-1/acme.inventory/inventoryItem/row-1',
        actualNamespacePath: 'business-1/acme.inventory/inventoryItem/row-1',
        context: {
          mode: 'draft',
          manifestHash: 'manifest-2',
          artifactHash: 'artifact-2',
        },
        hashPin: {
          artifactHash: 'artifact-stale',
        },
      });

    expect(execute).toThrowError(PluginSchemaHashMismatchError);
    try {
      execute();
    } catch (error) {
      expect(error).toBeInstanceOf(PluginSchemaHashMismatchError);
      if (error instanceof PluginSchemaHashMismatchError) {
        expect(error.payload.expected).toEqual({
          manifestHash: 'manifest-2',
          artifactHash: 'artifact-2',
        });
        expect(error.payload.actual).toEqual({
          artifactHash: 'artifact-stale',
        });
      }
    }
  });

  it('rejects records outside the expected namespace boundary', () => {
    const execute = () =>
      assertNamespaceHashPinningGuard({
        expectedNamespacePath: 'business-1/acme.inventory/inventoryItem/row-1',
        actualNamespacePath: 'business-2/acme.inventory/inventoryItem/row-1',
        context: {
          mode: 'release',
          manifestHash: 'manifest-1',
          artifactHash: 'artifact-1',
        },
      });

    expect(execute).toThrowError(PluginNamespaceMismatchError);
    try {
      execute();
    } catch (error) {
      expect(error).toBeInstanceOf(PluginNamespaceMismatchError);
      if (error instanceof PluginNamespaceMismatchError) {
        expect(error.payload).toEqual({
          expectedNamespacePath:
            'business-1/acme.inventory/inventoryItem/row-1',
          actualNamespacePath: 'business-2/acme.inventory/inventoryItem/row-1',
        });
      }
    }
  });
});
