import { describe, expect, it } from 'vitest';
import { toProjectScopedDraftId } from './-plugin-studio-project-draft-id';

describe('plugin studio project draft id helper', () => {
  it('creates deterministic draft id from project and plugin ids', () => {
    expect(
      toProjectScopedDraftId({
        projectId: 'project.acme',
        pluginId: 'plugin.sales',
      }),
    ).toBe('draft.project.acme.plugin.sales');
  });

  it('normalizes unsafe characters in project and plugin ids', () => {
    expect(
      toProjectScopedDraftId({
        projectId: 'Project Team / ACME',
        pluginId: 'Plugin:Sales Dashboard',
      }),
    ).toBe('draft.project_team_acme.plugin_sales_dashboard');
  });

  it('compacts very long ids to avoid oversized storage keys', () => {
    const projectId = `project.${'a'.repeat(100)}`;
    const pluginId = `plugin.${'b'.repeat(100)}`;
    const draftId = toProjectScopedDraftId({
      projectId,
      pluginId,
    });

    expect(draftId.length).toBeLessThanOrEqual(120);
    expect(draftId.startsWith('draft.project.aaaaaaaaaaaaaaaa')).toBe(true);
    expect(draftId.includes('.plugin.bbbbbbbbbbbbbbbb')).toBe(true);
    expect(draftId).toMatch(/^draft\.[a-z0-9._-]+\.[a-z0-9._-]+\.[a-z0-9]+$/);
    expect(
      toProjectScopedDraftId({
        projectId,
        pluginId,
      }),
    ).toBe(draftId);
  });
});
