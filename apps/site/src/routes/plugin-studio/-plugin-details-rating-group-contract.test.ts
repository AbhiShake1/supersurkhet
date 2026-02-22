import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const pluginDetailsRoutePath = resolve(
  process.cwd(),
  'src/routes/$businessName/admin/plugin/$pluginId.tsx',
);

function getRouteContent() {
  return readFileSync(pluginDetailsRoutePath, 'utf8');
}

describe('plugin details review data source', () => {
  it('loads and saves plugin reviews from DB-backed rows', () => {
    const content = getRouteContent();

    expect(content).toContain('api.pluginUserReview.useGet');
    expect(content).toContain('api.pluginUserReview.useCreate');
    expect(content).toContain('groupPluginReviewsByUser');
    expect(content).toContain('Save review');
    expect(content).toContain('buildPluginDetailView(');
    expect(content).toContain('reviews');
    expect(content).toContain('userId: actorUserId');
    expect(content).not.toContain('not stored in the database');
    expect(content).not.toContain('buildPluginDetailView(decoratedPlugin)');
  });
});
