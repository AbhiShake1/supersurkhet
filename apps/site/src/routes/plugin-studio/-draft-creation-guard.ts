export function shouldCreatePluginDraft({
  pluginId,
  isDraftLoading,
  isActorIdentityReady,
  activeDraftPluginId,
  hasAttemptedDraftCreation,
}: {
  pluginId: string;
  isDraftLoading: boolean;
  isActorIdentityReady: boolean;
  activeDraftPluginId: string | null | undefined;
  hasAttemptedDraftCreation: boolean;
}) {
  if (!pluginId.trim()) return false;
  if (isDraftLoading) return false;
  if (!isActorIdentityReady) return false;
  if (activeDraftPluginId === pluginId) return false;
  if (hasAttemptedDraftCreation) return false;
  return true;
}
