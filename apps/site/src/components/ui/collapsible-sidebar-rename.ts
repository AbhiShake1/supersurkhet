type RenameEntity = 'tab' | 'group';

export function commitSidebarRename({
  entity,
  previousValue,
  nextValue,
  onRename,
}: {
  entity: RenameEntity;
  previousValue: string;
  nextValue: string;
  onRename?: (previousValue: string, nextValue: string) => void;
}): boolean {
  const normalizedPreviousValue = previousValue.trim();
  const normalizedNextValue = nextValue.trim();
  if (!normalizedNextValue || normalizedNextValue === normalizedPreviousValue) {
    return false;
  }
  if (!onRename) {
    console.error('[collapsible-sidebar] Missing rename handler', {
      entity,
      previousValue,
      nextValue: normalizedNextValue,
    });
    return false;
  }
  try {
    onRename(previousValue, normalizedNextValue);
    return true;
  } catch (error) {
    console.error(
      '[collapsible-sidebar] Rename failed',
      {
        entity,
        previousValue,
        nextValue: normalizedNextValue,
      },
      error,
    );
    return false;
  }
}
