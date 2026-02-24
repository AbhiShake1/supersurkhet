function toStableProjectDraftSegment(value: string | undefined) {
  const normalized = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'unknown';
}

function toStableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function trimSegmentForCompactId(value: string, maxLength: number) {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength).replace(/[_-]+$/g, '') || 'unknown';
}

const MAX_DRAFT_ID_LENGTH = 120;
const COMPACT_SEGMENT_LENGTH = 24;

export function toProjectScopedDraftId({
  projectId,
  pluginId,
}: {
  projectId: string;
  pluginId: string;
}) {
  const projectSegment = toStableProjectDraftSegment(projectId);
  const pluginSegment = toStableProjectDraftSegment(pluginId);
  const fullDraftId = `draft.${projectSegment}.${pluginSegment}`;
  if (fullDraftId.length <= MAX_DRAFT_ID_LENGTH) {
    return fullDraftId;
  }

  const compactProjectSegment = trimSegmentForCompactId(
    projectSegment,
    COMPACT_SEGMENT_LENGTH,
  );
  const compactPluginSegment = trimSegmentForCompactId(
    pluginSegment,
    COMPACT_SEGMENT_LENGTH,
  );
  const digest = toStableHash(`${projectSegment}::${pluginSegment}`);
  return `draft.${compactProjectSegment}.${compactPluginSegment}.${digest}`;
}
