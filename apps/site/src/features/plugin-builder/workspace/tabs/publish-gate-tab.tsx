import type { PluginBuildDiagnostic } from '../../domain/validation/diagnostics-contract';
import {
  evaluatePublishWarningBlocklistPolicy,
  type PublishWarningBlocklistPolicy,
} from '../../domain/validation/publish-warning-blocklist-policy';

export type PublishReviewStatus =
  | 'not-required'
  | 'required-pending'
  | 'required-approved';

export type PublishGateStatus = 'blocked' | 'ready';

export type PublishGateBlockingReason =
  | 'error-diagnostics-present'
  | 'warning-blocklisted'
  | 'review-approval-required';

export type PublishGateImmutableRevision = {
  revisionId: string;
  summary: string;
  artifactHash: string;
};

export type CreatePublishGateTabStateInput = {
  diagnostics: readonly PluginBuildDiagnostic[];
  reviewStatus: PublishReviewStatus;
  environment: string;
  tenantId: string;
  warningBlocklistPolicy: PublishWarningBlocklistPolicy;
  immutableRevision: PublishGateImmutableRevision;
  isPublishConfirmationChecked: boolean;
};

export type PublishGateTabState = {
  diagnostics: PluginBuildDiagnostic[];
  reviewStatus: PublishReviewStatus;
  publishGateStatus: PublishGateStatus;
  blockingReasons: PublishGateBlockingReason[];
  blockedWarningCodes: string[];
  isPublishConfirmationChecked: boolean;
  immutableRevision: PublishGateImmutableRevision;
  canPublish: boolean;
  isPublishActionEnabled: boolean;
};

export type PublishGateTabProps = {
  state: PublishGateTabState;
  onPublishConfirmationChange: (checked: boolean) => void;
};

export function createPublishGateTabState({
  diagnostics,
  reviewStatus,
  environment,
  tenantId,
  warningBlocklistPolicy,
  immutableRevision,
  isPublishConfirmationChecked,
}: CreatePublishGateTabStateInput): PublishGateTabState {
  const warningCodes = diagnostics
    .filter((diagnostic) => diagnostic.severity === 'warning')
    .map((diagnostic) => diagnostic.code);

  const warningBlocklistResult = evaluatePublishWarningBlocklistPolicy({
    warningCodes,
    environment,
    tenantId,
    policy: warningBlocklistPolicy,
  });

  const hasErrorDiagnostics = diagnostics.some(
    (diagnostic) => diagnostic.severity === 'error',
  );

  const isReviewBlocking = reviewStatus === 'required-pending';

  const blockingReasons = toBlockingReasons({
    hasErrorDiagnostics,
    hasBlockedWarnings: warningBlocklistResult.isBlocked,
    isReviewBlocking,
  });

  const publishGateStatus: PublishGateStatus =
    blockingReasons.length > 0 ? 'blocked' : 'ready';
  const canPublish =
    publishGateStatus === 'ready' && isPublishConfirmationChecked;

  return {
    diagnostics: [...diagnostics],
    reviewStatus,
    publishGateStatus,
    blockingReasons,
    blockedWarningCodes: warningBlocklistResult.blockingWarningCodes,
    isPublishConfirmationChecked,
    immutableRevision,
    canPublish,
    isPublishActionEnabled: canPublish,
  };
}

export function setPublishConfirmationChecked(
  state: PublishGateTabState,
  isPublishConfirmationChecked: boolean,
): PublishGateTabState {
  const canPublish =
    state.publishGateStatus === 'ready' && isPublishConfirmationChecked;

  return {
    ...state,
    isPublishConfirmationChecked,
    canPublish,
    isPublishActionEnabled: canPublish,
  };
}

export function getPublishConfirmationLabel(
  immutableRevision: PublishGateImmutableRevision,
): string {
  return `I confirm publishing immutable revision ${immutableRevision.revisionId} (${immutableRevision.summary}) with artifact hash ${immutableRevision.artifactHash}.`;
}

export function PublishGateTab({
  state,
  onPublishConfirmationChange,
}: PublishGateTabProps) {
  return (
    <section aria-label="Publish gate tab">
      <h2>Publish Gate</h2>

      <article>
        <h3>Immutable Revision</h3>
        <dl>
          <dt>Revision ID</dt>
          <dd>{state.immutableRevision.revisionId}</dd>
          <dt>Summary</dt>
          <dd>{state.immutableRevision.summary}</dd>
          <dt>Artifact Hash</dt>
          <dd>{state.immutableRevision.artifactHash}</dd>
        </dl>
      </article>

      <article>
        <h3>Publish Readiness</h3>
        <p>Status: {state.publishGateStatus}</p>

        {state.blockingReasons.length > 0 ? (
          <ul aria-label="Publish blocking reasons">
            {state.blockingReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        ) : (
          <p>No publish blockers.</p>
        )}

        {state.blockedWarningCodes.length > 0 ? (
          <ul aria-label="Blocked warning codes">
            {state.blockedWarningCodes.map((code) => (
              <li key={code}>{code}</li>
            ))}
          </ul>
        ) : null}
      </article>

      <article>
        <h3>Explicit Confirmation</h3>
        <label>
          <input
            type="checkbox"
            checked={state.isPublishConfirmationChecked}
            onChange={(event) => {
              onPublishConfirmationChange(event.target.checked);
            }}
          />
          {getPublishConfirmationLabel(state.immutableRevision)}
        </label>
      </article>

      <button type="button" disabled={!state.isPublishActionEnabled}>
        Publish release
      </button>
    </section>
  );
}

function toBlockingReasons({
  hasErrorDiagnostics,
  hasBlockedWarnings,
  isReviewBlocking,
}: {
  hasErrorDiagnostics: boolean;
  hasBlockedWarnings: boolean;
  isReviewBlocking: boolean;
}): PublishGateBlockingReason[] {
  const reasons: PublishGateBlockingReason[] = [];

  if (hasErrorDiagnostics) {
    reasons.push('error-diagnostics-present');
  }

  if (hasBlockedWarnings) {
    reasons.push('warning-blocklisted');
  }

  if (isReviewBlocking) {
    reasons.push('review-approval-required');
  }

  return reasons;
}
