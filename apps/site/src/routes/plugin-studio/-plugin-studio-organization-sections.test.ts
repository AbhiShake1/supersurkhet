import { describe, expect, it } from 'vitest';
import {
  ORGANIZATION_SECTION_IDS,
  organizationSectionLabel,
} from './-plugin-studio-organization-sections';

describe('plugin studio organization sections', () => {
  it('keeps only supported organization sections', () => {
    expect(ORGANIZATION_SECTION_IDS).toEqual([
      'projects',
      'team',
      'integrations',
      'settings',
    ]);
  });

  it('resolves labels for known sections', () => {
    expect(organizationSectionLabel('integrations')).toBe('Integrations');
    expect(organizationSectionLabel('settings')).toBe('Organization settings');
  });
});
