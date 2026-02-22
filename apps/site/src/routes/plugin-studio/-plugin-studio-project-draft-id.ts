function toStableProjectDraftSegment(value: string | undefined) {
  const normalized = (value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return normalized || 'unknown';
}

export function toProjectScopedDraftId({
  projectId,
  pluginId,
}: {
  projectId: string;
  pluginId: string;
}) {
  return `draft.${toStableProjectDraftSegment(projectId)}.${toStableProjectDraftSegment(pluginId)}`;
}

