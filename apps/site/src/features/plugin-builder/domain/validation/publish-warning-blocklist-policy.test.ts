import { describe, expect, it } from 'vitest';
import { evaluatePublishWarningBlocklistPolicy } from './publish-warning-blocklist-policy';

describe('publish warning blocklist policy', () => {
  it('does not block publish when effective blocklist is empty', () => {
    const result = evaluatePublishWarningBlocklistPolicy({
      warningCodes: ['warn-unused-field', 'warn-missing-help-text'],
      environment: 'production',
      tenantId: 'tenant-acme',
      policy: {
        defaultWarningBlocklistByEnvironment: {
          staging: ['warn-only-staging'],
        },
      },
    });

    expect(result).toEqual({
      isBlocked: false,
      effectiveWarningBlocklist: [],
      blockingWarningCodes: [],
      blockingReasons: [],
    });
  });

  it('blocks only warning codes present in the effective blocklist', () => {
    const result = evaluatePublishWarningBlocklistPolicy({
      warningCodes: ['warn-unused-field', 'warn-missing-help-text'],
      environment: 'production',
      tenantId: 'tenant-acme',
      policy: {
        defaultWarningBlocklistByEnvironment: {
          production: ['warn-unused-field', 'warn-future-proofing'],
        },
      },
    });

    expect(result).toEqual({
      isBlocked: true,
      effectiveWarningBlocklist: ['warn-future-proofing', 'warn-unused-field'],
      blockingWarningCodes: ['warn-unused-field'],
      blockingReasons: [
        {
          code: 'warn-unused-field',
          reason: 'warning-code-blocklisted',
          source: 'default',
          environment: 'production',
        },
      ],
    });
  });

  it('uses tenant environment override instead of default blocklist for the same environment', () => {
    const result = evaluatePublishWarningBlocklistPolicy({
      warningCodes: ['warn-unused-field', 'warn-missing-help-text'],
      environment: 'production',
      tenantId: 'tenant-acme',
      policy: {
        defaultWarningBlocklistByEnvironment: {
          production: ['warn-unused-field'],
        },
        tenantWarningBlocklistOverrides: {
          'tenant-acme': {
            warningBlocklistByEnvironment: {
              production: ['warn-missing-help-text'],
            },
          },
        },
      },
    });

    expect(result).toEqual({
      isBlocked: true,
      effectiveWarningBlocklist: ['warn-missing-help-text'],
      blockingWarningCodes: ['warn-missing-help-text'],
      blockingReasons: [
        {
          code: 'warn-missing-help-text',
          reason: 'warning-code-blocklisted',
          source: 'tenant-override',
          environment: 'production',
          tenantId: 'tenant-acme',
        },
      ],
    });
  });
});
