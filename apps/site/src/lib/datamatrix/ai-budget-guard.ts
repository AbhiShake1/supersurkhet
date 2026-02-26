export const VISION_PROVIDER_PATHS = ['official', 'optional'] as const;

export type VisionProviderPath = (typeof VISION_PROVIDER_PATHS)[number];

export interface AiBudgetPolicy {
  maxCallsPerScanAttempt: number;
  maxCallsPerSession: number;
  dedupeWindowMs: number;
}

export const AI_BUDGET_DEFAULT_POLICY: AiBudgetPolicy = {
  maxCallsPerScanAttempt: 2,
  maxCallsPerSession: 8,
  dedupeWindowMs: 45_000,
};

export interface AiBudgetGuardState {
  perScanAttemptCalls: Record<string, number>;
  perSessionCalls: Record<string, number>;
  dedupeByProviderHash: Record<string, number>;
}

export const EMPTY_AI_BUDGET_GUARD_STATE: AiBudgetGuardState = {
  perScanAttemptCalls: {},
  perSessionCalls: {},
  dedupeByProviderHash: {},
};

export type AiBudgetBlockedReason =
  | 'scan_cap_exceeded'
  | 'session_cap_exceeded'
  | 'dedupe_window_active';

export interface AiBudgetSnapshot {
  scanAttemptCalls: number;
  sessionCalls: number;
  remainingScanBudget: number;
  remainingSessionBudget: number;
}

export type AiBudgetDecision =
  | {
      allowed: true;
      reason: 'allowed';
      dedupeKey: string;
      snapshot: AiBudgetSnapshot;
      nextState: AiBudgetGuardState;
    }
  | {
      allowed: false;
      reason: AiBudgetBlockedReason;
      dedupeKey: string;
      snapshot: AiBudgetSnapshot;
      nextState: AiBudgetGuardState;
    };

export interface ConsumeAiBudgetInput {
  state: AiBudgetGuardState;
  sessionId: string;
  scanAttemptId: string;
  scanHash: string;
  providerPath: VisionProviderPath;
  occurredAt: number;
  policy?: Partial<AiBudgetPolicy>;
}

function normalizePositiveInteger(value: number | undefined, fallback: number) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  const next = Math.floor(value as number);
  return next > 0 ? next : fallback;
}

export function resolveAiBudgetPolicy(
  input?: Partial<AiBudgetPolicy>,
): AiBudgetPolicy {
  return {
    maxCallsPerScanAttempt: normalizePositiveInteger(
      input?.maxCallsPerScanAttempt,
      AI_BUDGET_DEFAULT_POLICY.maxCallsPerScanAttempt,
    ),
    maxCallsPerSession: normalizePositiveInteger(
      input?.maxCallsPerSession,
      AI_BUDGET_DEFAULT_POLICY.maxCallsPerSession,
    ),
    dedupeWindowMs: normalizePositiveInteger(
      input?.dedupeWindowMs,
      AI_BUDGET_DEFAULT_POLICY.dedupeWindowMs,
    ),
  };
}

export function createAiBudgetGuardState(
  seed: Partial<AiBudgetGuardState> = {},
): AiBudgetGuardState {
  return {
    perScanAttemptCalls: { ...(seed.perScanAttemptCalls ?? {}) },
    perSessionCalls: { ...(seed.perSessionCalls ?? {}) },
    dedupeByProviderHash: { ...(seed.dedupeByProviderHash ?? {}) },
  };
}

export function toAiBudgetDedupeKey(input: {
  sessionId: string;
  scanHash: string;
  providerPath: VisionProviderPath;
}) {
  return `${input.sessionId}::${input.providerPath}::${input.scanHash}`;
}

function pruneDedupeLedger(
  ledger: Record<string, number>,
  minTimestamp: number,
): Record<string, number> {
  const next: Record<string, number> = {};
  for (const [key, value] of Object.entries(ledger)) {
    if (value >= minTimestamp) {
      next[key] = value;
    }
  }
  return next;
}

function toSnapshot(
  scanAttemptCalls: number,
  sessionCalls: number,
  policy: AiBudgetPolicy,
): AiBudgetSnapshot {
  return {
    scanAttemptCalls,
    sessionCalls,
    remainingScanBudget: Math.max(
      0,
      policy.maxCallsPerScanAttempt - scanAttemptCalls,
    ),
    remainingSessionBudget: Math.max(
      0,
      policy.maxCallsPerSession - sessionCalls,
    ),
  };
}

export function consumeAiBudget(input: ConsumeAiBudgetInput): AiBudgetDecision {
  const policy = resolveAiBudgetPolicy(input.policy);
  const dedupeLedger = pruneDedupeLedger(
    input.state.dedupeByProviderHash,
    input.occurredAt - policy.dedupeWindowMs,
  );
  const dedupeKey = toAiBudgetDedupeKey({
    sessionId: input.sessionId,
    scanHash: input.scanHash,
    providerPath: input.providerPath,
  });

  const scanAttemptCalls =
    input.state.perScanAttemptCalls[input.scanAttemptId] ?? 0;
  const sessionCalls = input.state.perSessionCalls[input.sessionId] ?? 0;

  if (scanAttemptCalls >= policy.maxCallsPerScanAttempt) {
    return {
      allowed: false,
      reason: 'scan_cap_exceeded',
      dedupeKey,
      snapshot: toSnapshot(scanAttemptCalls, sessionCalls, policy),
      nextState: {
        ...input.state,
        dedupeByProviderHash: dedupeLedger,
      },
    };
  }

  if (sessionCalls >= policy.maxCallsPerSession) {
    return {
      allowed: false,
      reason: 'session_cap_exceeded',
      dedupeKey,
      snapshot: toSnapshot(scanAttemptCalls, sessionCalls, policy),
      nextState: {
        ...input.state,
        dedupeByProviderHash: dedupeLedger,
      },
    };
  }

  const lastSeenAt = dedupeLedger[dedupeKey];
  if (
    typeof lastSeenAt === 'number' &&
    input.occurredAt - lastSeenAt < policy.dedupeWindowMs
  ) {
    return {
      allowed: false,
      reason: 'dedupe_window_active',
      dedupeKey,
      snapshot: toSnapshot(scanAttemptCalls, sessionCalls, policy),
      nextState: {
        ...input.state,
        dedupeByProviderHash: dedupeLedger,
      },
    };
  }

  const nextScanAttemptCalls = scanAttemptCalls + 1;
  const nextSessionCalls = sessionCalls + 1;

  return {
    allowed: true,
    reason: 'allowed',
    dedupeKey,
    snapshot: toSnapshot(nextScanAttemptCalls, nextSessionCalls, policy),
    nextState: {
      perScanAttemptCalls: {
        ...input.state.perScanAttemptCalls,
        [input.scanAttemptId]: nextScanAttemptCalls,
      },
      perSessionCalls: {
        ...input.state.perSessionCalls,
        [input.sessionId]: nextSessionCalls,
      },
      dedupeByProviderHash: {
        ...dedupeLedger,
        [dedupeKey]: input.occurredAt,
      },
    },
  };
}
