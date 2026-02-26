import { describe, expect, it } from 'vitest';
import {
  buildPublishFailureToastPayload,
  extractPublishFailureDiagnostics,
  toErrorMessage,
} from './-publish-error-diagnostics';

describe('publish error diagnostics', () => {
  it('extracts diagnostics from nested server error payloads', () => {
    const errorPayload = {
      message: 'Publish blocked by V3 gate diagnostics',
      diagnostics: [
        {
          code: 'missing-action-capabilities',
          severity: 'error',
          message:
            'Action "inventory.sync" must declare at least one capability',
          path: ['actionManifest', '0', 'capabilities'],
        },
      ],
      compile: {
        all: [
          {
            code: 'compile-type-error',
            severity: 'error',
            message: 'Workflow type mismatch',
            path: ['schemaDocs', '0', 'workflows', '0'],
          },
        ],
      },
    };

    const diagnostics = extractPublishFailureDiagnostics(errorPayload);
    expect(diagnostics).toHaveLength(2);
    expect(diagnostics).toContainEqual({
      code: 'missing-action-capabilities',
      severity: 'error',
      message: 'Action "inventory.sync" must declare at least one capability',
      path: 'actionManifest.0.capabilities',
    });
    expect(diagnostics).toContainEqual({
      code: 'compile-type-error',
      severity: 'error',
      message: 'Workflow type mismatch',
      path: 'schemaDocs.0.workflows.0',
    });
  });

  it('builds an actionable publish toast from diagnostics', () => {
    const payload = buildPublishFailureToastPayload({
      diagnostics: [
        {
          severity: 'error',
          message: 'Duplicate actionId "inventory.sync"',
          path: ['actionManifest', '1', 'actionId'],
        },
      ],
    });

    expect(payload).toEqual({
      title: 'Publish blocked by diagnostics',
      description:
        '- Duplicate actionId "inventory.sync" (actionManifest.1.actionId)',
    });
  });

  it('falls back to generic publish failure details when diagnostics are absent', () => {
    const payload = buildPublishFailureToastPayload(
      new Error('Network timeout'),
    );
    expect(payload).toEqual({
      title: 'Publish failed',
      description: 'Network timeout',
    });
    expect(toErrorMessage({ reason: 'Bad gateway' })).toBe('Bad gateway');
  });
});
