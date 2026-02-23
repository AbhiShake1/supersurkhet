const DEFAULT_PREFIX = 'draftrev';

function toStableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

export function toDraftRevisionRowId({
  draftId,
  revisionId,
  prefix = DEFAULT_PREFIX,
}: {
  draftId: string;
  revisionId: string;
  prefix?: string;
}) {
  return `${prefix}.${toStableHash(draftId)}.${revisionId}`;
}
