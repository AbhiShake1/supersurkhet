export type PublishWarningBlocklistByEnvironment = Record<
  string,
  readonly string[]
>;

export type TenantWarningBlocklistOverride = {
  warningBlocklistByEnvironment: PublishWarningBlocklistByEnvironment;
};

export type PublishWarningBlocklistPolicy = {
  defaultWarningBlocklistByEnvironment: PublishWarningBlocklistByEnvironment;
  tenantWarningBlocklistOverrides?: Record<
    string,
    TenantWarningBlocklistOverride
  >;
};

export type EvaluatePublishWarningBlocklistPolicyInput = {
  warningCodes: readonly string[];
  environment: string;
  tenantId: string;
  policy: PublishWarningBlocklistPolicy;
};

export type PublishWarningBlockingReason = {
  code: string;
  reason: 'warning-code-blocklisted';
  source: 'default' | 'tenant-override';
  environment: string;
  tenantId?: string;
};

export type EvaluatePublishWarningBlocklistPolicyResult = {
  isBlocked: boolean;
  effectiveWarningBlocklist: string[];
  blockingWarningCodes: string[];
  blockingReasons: PublishWarningBlockingReason[];
};

export function evaluatePublishWarningBlocklistPolicy({
  warningCodes,
  environment,
  tenantId,
  policy,
}: EvaluatePublishWarningBlocklistPolicyInput): EvaluatePublishWarningBlocklistPolicyResult {
  const tenantOverride =
    policy.tenantWarningBlocklistOverrides?.[tenantId]
      ?.warningBlocklistByEnvironment[environment];

  const source: PublishWarningBlockingReason['source'] = tenantOverride
    ? 'tenant-override'
    : 'default';

  const rawEffectiveBlocklist =
    tenantOverride ??
    policy.defaultWarningBlocklistByEnvironment[environment] ??
    [];

  const effectiveWarningBlocklist = toSortedUnique(rawEffectiveBlocklist);
  const effectiveBlocklistSet = new Set(effectiveWarningBlocklist);

  const blockingWarningCodes = toSortedUnique(
    warningCodes.filter((warningCode) =>
      effectiveBlocklistSet.has(warningCode),
    ),
  );

  const blockingReasons = blockingWarningCodes.map((code) => ({
    code,
    reason: 'warning-code-blocklisted' as const,
    source,
    environment,
    ...(source === 'tenant-override' ? { tenantId } : {}),
  }));

  return {
    isBlocked: blockingWarningCodes.length > 0,
    effectiveWarningBlocklist,
    blockingWarningCodes,
    blockingReasons,
  };
}

function toSortedUnique(values: readonly string[]): string[] {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}
