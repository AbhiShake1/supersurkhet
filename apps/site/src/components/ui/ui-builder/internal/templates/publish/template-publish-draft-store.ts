export type TemplatePublishDraft = {
  templateSlug: string;
  title: string;
  description: string;
  category: string;
  tags: string;
};

export const DEFAULT_TEMPLATE_PUBLISH_DRAFT: TemplatePublishDraft = {
  templateSlug: 'starter',
  title: '',
  description: '',
  category: '',
  tags: '',
};

export function getTemplatePublishDraftStorageKey(businessId: string) {
  return `ui-template-publish-draft:${businessId}`;
}

export function readTemplatePublishDraft(
  storage: Storage | null | undefined,
  key: string,
): Partial<TemplatePublishDraft> | null {
  if (!storage || typeof storage.getItem !== 'function') {
    return null;
  }

  const raw = storage.getItem(key);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const partial: Partial<TemplatePublishDraft> = {};
    if (typeof parsed.templateSlug === 'string') {
      partial.templateSlug = parsed.templateSlug;
    }
    if (typeof parsed.title === 'string') {
      partial.title = parsed.title;
    }
    if (typeof parsed.description === 'string') {
      partial.description = parsed.description;
    }
    if (typeof parsed.category === 'string') {
      partial.category = parsed.category;
    }
    if (typeof parsed.tags === 'string') {
      partial.tags = parsed.tags;
    }
    return partial;
  } catch {
    return null;
  }
}

export function writeTemplatePublishDraft(
  storage: Storage | null | undefined,
  key: string,
  draft: TemplatePublishDraft,
) {
  if (!storage || typeof storage.setItem !== 'function') {
    return;
  }
  storage.setItem(key, JSON.stringify(draft));
}
