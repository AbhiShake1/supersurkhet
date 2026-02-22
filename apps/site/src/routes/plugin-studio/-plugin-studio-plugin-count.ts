type PluginProjectReference = {
  projectId: string;
};

export function countPluginsByProjectId(
  pluginItems: readonly PluginProjectReference[],
) {
  const counts = new Map<string, number>();
  for (const pluginItem of pluginItems) {
    const projectId = pluginItem.projectId.trim();
    if (!projectId) continue;
    counts.set(projectId, (counts.get(projectId) ?? 0) + 1);
  }
  return counts;
}
