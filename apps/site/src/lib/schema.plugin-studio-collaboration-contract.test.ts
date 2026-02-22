import { describe, expect, it } from 'vitest';
import { coreSchema } from '@/lib/schema';

function readShapeKeys(schema: unknown): string[] {
  const shape =
    (schema as { shape?: Record<string, unknown> | (() => Record<string, unknown>) })
      .shape ?? {};
  const resolvedShape = typeof shape === 'function' ? shape() : shape;
  return Object.keys(resolvedShape ?? {});
}

describe('plugin studio collaboration schema contract', () => {
  it('registers project, project member, and project invite tables in core schema', () => {
    const keys = Object.keys(coreSchema.rawShape);

    expect(keys).toContain('pluginProject');
    expect(keys).toContain('pluginProjectMember');
    expect(keys).toContain('pluginProjectInvite');
  });

  it('exposes project linkage fields in plugin draft and collaboration tables', () => {
    const draftKeys = readShapeKeys(coreSchema.rawShape.pluginDraft.schema);
    const projectKeys = readShapeKeys(coreSchema.rawShape.pluginProject.schema);
    const projectMemberKeys = readShapeKeys(
      coreSchema.rawShape.pluginProjectMember.schema,
    );
    const projectInviteKeys = readShapeKeys(
      coreSchema.rawShape.pluginProjectInvite.schema,
    );

    expect(draftKeys).toContain('projectId');
    expect(projectKeys).toContain('ownerUserId');
    expect(projectMemberKeys).toContain('projectId');
    expect(projectMemberKeys).toContain('userId');
    expect(projectInviteKeys).toContain('projectId');
    expect(projectInviteKeys).toContain('email');
  });
});
