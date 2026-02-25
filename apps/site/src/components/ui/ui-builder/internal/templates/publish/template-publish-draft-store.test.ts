import { describe, expect, it } from 'vitest';
import {
  DEFAULT_TEMPLATE_PUBLISH_DRAFT,
  getTemplatePublishDraftStorageKey,
  readTemplatePublishDraft,
  writeTemplatePublishDraft,
} from './template-publish-draft-store';

describe('template-publish-draft-store', () => {
  it('builds scoped draft storage keys', () => {
    expect(getTemplatePublishDraftStorageKey('business-1')).toBe(
      'ui-template-publish-draft:business-1',
    );
  });

  it('writes and restores draft values from storage', () => {
    const bucket = new Map<string, string>();
    const storage = {
      getItem: (key: string) => bucket.get(key) ?? null,
      setItem: (key: string, value: string) => {
        bucket.set(key, value);
      },
    } as Storage;

    const key = getTemplatePublishDraftStorageKey('business-2');
    const draft = {
      ...DEFAULT_TEMPLATE_PUBLISH_DRAFT,
      templateSlug: 'saved-template',
      title: 'Saved title',
      description: 'Saved description',
      category: 'restaurant',
      tags: 'home, checkout',
    };

    writeTemplatePublishDraft(storage, key, draft);

    expect(readTemplatePublishDraft(storage, key)).toEqual(draft);
  });
});
