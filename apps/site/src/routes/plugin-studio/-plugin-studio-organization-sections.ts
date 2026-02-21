export const ORGANIZATION_SECTION_IDS = [
  'projects',
  'team',
  'integrations',
  'settings',
] as const;

export type PluginStudioOrganizationSection =
  (typeof ORGANIZATION_SECTION_IDS)[number];

export function organizationSectionLabel(
  section: PluginStudioOrganizationSection,
): string {
  if (section === 'projects') return 'Projects';
  if (section === 'team') return 'Team';
  if (section === 'integrations') return 'Integrations';
  return 'Organization settings';
}
