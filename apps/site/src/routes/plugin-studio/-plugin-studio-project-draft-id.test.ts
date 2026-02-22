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
});
