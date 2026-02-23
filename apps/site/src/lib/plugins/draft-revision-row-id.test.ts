import { describe, expect, it } from 'vitest';
import { toDraftRevisionRowId } from './draft-revision-row-id';

describe('toDraftRevisionRowId', () => {
  it('is deterministic for identical inputs', () => {
    const id1 = toDraftRevisionRowId({
      draftId: 'draft.project.alpha.plugin.beta',
      revisionId: 'rev-1',
    });
    const id2 = toDraftRevisionRowId({
      draftId: 'draft.project.alpha.plugin.beta',
      revisionId: 'rev-1',
    });

    expect(id1).toBe(id2);
  });

  it('keeps ids compact even for long draft ids', () => {
    const longDraftId =
      'draft.project.etp5tisukuxzbthmh5ggjjtmexvribkjpeoz8qn40ki.8c616z0msvstskst5oeidxd9jbwnwqfmhd73fychbhw.abc.plugin.etp5tisukuxzbthmh5ggjjtmexvribkjpeoz8qn40ki.8c616z0msvstskst5oeidxd9jbwnwqfmhd73fychbhw.abc';
    const rowId = toDraftRevisionRowId({
      draftId: longDraftId,
      revisionId: 'mhzkzdj2-1a2b3c4d',
    });

    expect(rowId.length).toBeLessThan(64);
    expect(rowId).toMatch(/^draftrev\.[a-z0-9]+\.[a-z0-9-]+$/);
  });
});
