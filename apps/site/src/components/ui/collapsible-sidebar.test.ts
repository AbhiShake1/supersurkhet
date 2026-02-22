import { LucideBriefcaseBusiness, Menu } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { getTabIcon } from './collapsible-sidebar-icons';

describe('getTabIcon', () => {
  it('falls back safely when a tab schema has no app metadata', () => {
    const icon = getTabIcon({
      schema: '__missing_schema__',
      title: 'Broken schema tab',
    } as never);

    expect(icon).toBe(LucideBriefcaseBusiness);
  });

  it('falls back to menu icon when tab input is undefined', () => {
    expect(getTabIcon(undefined)).toBe(Menu);
  });
});
