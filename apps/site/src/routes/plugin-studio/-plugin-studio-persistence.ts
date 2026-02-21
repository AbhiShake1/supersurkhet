type ThrowOnFailedPersistenceWritesArgs = {
  context: string;
  settled: readonly PromiseSettledResult<unknown>[];
};

export function throwOnFailedPersistenceWrites({
  context,
  settled,
}: ThrowOnFailedPersistenceWritesArgs) {
  const rejected = settled.filter(
    (result): result is PromiseRejectedResult => result.status === 'rejected',
  );

  if (rejected.length === 0) {
    return;
  }

  if (rejected.length === 1) {
    throw rejected[0].reason;
  }

  throw new AggregateError(
    rejected.map((result) => result.reason),
    `${context} failed: ${rejected.length} writes failed`,
  );
}
