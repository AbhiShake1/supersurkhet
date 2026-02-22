import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { PluginBuildDiagnostic } from '../../domain/validation/diagnostics-contract';
import type { PublishWarningBlocklistPolicy } from '../../domain/validation/publish-warning-blocklist-policy';
import {
  createPublishGateTabState,
  PublishGateTab,
  setPublishConfirmationChecked,
} from './publish-gate-tab';

const DEFAULT_POLICY: PublishWarningBlocklistPolicy = {
  defaultWarningBlocklistByEnvironment: {
    production: ['warn-unused-field'],
  },
};

function createDiagnostic(
  partial: Partial<PluginBuildDiagnostic> = {},
): PluginBuildDiagnostic {
  return {
    code: 'custom-diagnostic',
    severity: 'info',
    path: ['draft'],
    message: 'diagnostic',
    ...partial,
  };
}

describe('PublishGateTab', () => {
  it('blocks publish when diagnostics include error severity', () => {
    const state = createPublishGateTabState({
      diagnostics: [
        createDiagnostic({
          code: 'cycle-detected',
          severity: 'error',
          path: ['workflows', '0'],
          message: 'Workflow contains a cycle.',
        }),
      ],
      reviewStatus: 'required-approved',
      environment: 'production',
      tenantId: 'tenant_acme',
      warningBlocklistPolicy: DEFAULT_POLICY,
      immutableRevision: {
        revisionId: 'rev_42',
        summary: 'Checkout flow now handles coupon edge cases',
        artifactHash: 'sha256:abc123',
      },
      isPublishConfirmationChecked: true,
    });

    expect(state.canPublish).toBe(false);
    expect(state.publishGateStatus).toBe('blocked');
    expect(state.blockingReasons).toContain('error-diagnostics-present');
  });

  it('blocks publish when review is required and not yet approved', () => {
    const state = createPublishGateTabState({
      diagnostics: [
        createDiagnostic({
          code: 'missing-capability',
          severity: 'warning',
        }),
      ],
      reviewStatus: 'required-pending',
      environment: 'staging',
      tenantId: 'tenant_acme',
      warningBlocklistPolicy: DEFAULT_POLICY,
      immutableRevision: {
        revisionId: 'rev_42',
        summary: 'Checkout flow now handles coupon edge cases',
        artifactHash: 'sha256:abc123',
      },
      isPublishConfirmationChecked: true,
    });

    expect(state.canPublish).toBe(false);
    expect(state.blockingReasons).toContain('review-approval-required');
  });

  it('enforces explicit confirmation after diagnostics and review gates pass', () => {
    const readyWithoutConfirmation = createPublishGateTabState({
      diagnostics: [
        createDiagnostic({
          code: 'missing-capability',
          severity: 'warning',
        }),
      ],
      reviewStatus: 'required-approved',
      environment: 'staging',
      tenantId: 'tenant_acme',
      warningBlocklistPolicy: DEFAULT_POLICY,
      immutableRevision: {
        revisionId: 'rev_42',
        summary: 'Checkout flow now handles coupon edge cases',
        artifactHash: 'sha256:abc123',
      },
      isPublishConfirmationChecked: false,
    });

    expect(readyWithoutConfirmation.publishGateStatus).toBe('ready');
    expect(readyWithoutConfirmation.isPublishActionEnabled).toBe(false);

    const confirmed = setPublishConfirmationChecked(
      readyWithoutConfirmation,
      true,
    );

    expect(confirmed.publishGateStatus).toBe('ready');
    expect(confirmed.canPublish).toBe(true);
    expect(confirmed.isPublishActionEnabled).toBe(true);

    const html = renderToStaticMarkup(
      <PublishGateTab
        state={confirmed}
        onPublishConfirmationChange={() => {}}
      />,
    );

    expect(html).toContain('rev_42');
    expect(html).toContain('Checkout flow now handles coupon edge cases');
    expect(html).toContain('sha256:abc123');
    expect(html).toContain('Publish release');
  });

  it('blocks warning codes that are present in publish blocklist policy', () => {
    const state = createPublishGateTabState({
      diagnostics: [
        createDiagnostic({
          code: 'warn-unused-field',
          severity: 'warning',
        }),
      ],
      reviewStatus: 'not-required',
      environment: 'production',
      tenantId: 'tenant_acme',
      warningBlocklistPolicy: DEFAULT_POLICY,
      immutableRevision: {
        revisionId: 'rev_42',
        summary: 'Checkout flow now handles coupon edge cases',
        artifactHash: 'sha256:abc123',
      },
      isPublishConfirmationChecked: true,
    });

    expect(state.canPublish).toBe(false);
    expect(state.publishGateStatus).toBe('blocked');
    expect(state.blockedWarningCodes).toEqual(['warn-unused-field']);
    expect(state.blockingReasons).toContain('warning-blocklisted');
  });
});
