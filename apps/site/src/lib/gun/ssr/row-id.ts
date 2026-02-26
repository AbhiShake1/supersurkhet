const MAX_ROW_ID_LENGTH = 96;
const COMPACT_HEAD_LENGTH = 40;

function toStableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function toSafeSegment(value: string) {
  const withoutControlChars = Array.from(value.trim())
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join('');

  return withoutControlChars
    .replace(/[^a-zA-Z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

export function createTimestampRowId(prefix = 'row') {
  const safePrefix = toSafeSegment(prefix).toLowerCase() || 'row';
  const stamp = Date.now().toString(36);
  const nonce = Math.random().toString(36).slice(2, 8);
  return `${safePrefix}.${stamp}${nonce}`;
}

export function normalizeRowId(rawId: unknown, fallbackPrefix = 'row') {
  const raw = toSafeSegment(String(rawId ?? ''));
  if (!raw) {
    return createTimestampRowId(fallbackPrefix);
  }
  if (raw.length <= MAX_ROW_ID_LENGTH) {
    return raw;
  }
  const head =
    raw.slice(0, COMPACT_HEAD_LENGTH).replace(/[_-]+$/g, '') || 'row';
  const digest = toStableHash(raw);
  return `${head}.${digest}`;
}
