import { describe, expect, it } from 'vitest';
import { countPluginsByProjectId } from './-plugin-studio-plugin-count';

describe('plugin studio plugin count helper', () => {
  it('counts plugins per project id', () => {
    const counts = countPluginsByProjectId([
      { projectId: 'project.alpha' },
      { projectId: 'project.alpha' },
      { projectId: 'project.bravo' },
    ]);

    expect(counts.get('project.alpha')).toBe(2);
    expect(counts.get('project.bravo')).toBe(1);
  });

  it('ignores empty project ids', () => {
    const counts = countPluginsByProjectId([
      { projectId: 'project.alpha' },
      { projectId: '' },
      { projectId: '   ' },
    ]);

    expect(counts.get('project.alpha')).toBe(1);
    expect(counts.size).toBe(1);
  });
});
