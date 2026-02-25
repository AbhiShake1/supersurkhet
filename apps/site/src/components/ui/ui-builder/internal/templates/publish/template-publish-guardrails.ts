import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import type { TemplatePublishDraft } from './template-publish-draft-store';

export function slugifyTemplateSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 64);
}

export function collectSuggestedPublishTags(layers: ComponentLayer[]) {
  return layers
    .map((layer) => layer.name?.trim())
    .filter((name): name is string => Boolean(name))
    .slice(0, 5);
}

export type PublishGuardrail = {
  id: 'templateSlug' | 'title' | 'description' | 'layers';
  message: string;
};

export function getTemplatePublishGuardrails(
  draft: TemplatePublishDraft,
  layers: ComponentLayer[],
) {
  const guardrails: PublishGuardrail[] = [];

  if (!draft.templateSlug.trim()) {
    guardrails.push({
      id: 'templateSlug',
      message: 'Template slug is required.',
    });
  }
  if (!draft.title.trim()) {
    guardrails.push({
      id: 'title',
      message: 'Template title is required.',
    });
  }
  if (!draft.description.trim()) {
    guardrails.push({
      id: 'description',
      message: 'Template description is required.',
    });
  }
  if (layers.length === 0) {
    guardrails.push({
      id: 'layers',
      message: 'Add at least one page before publishing a template.',
    });
  }

  return {
    guardrails,
    canPublish: guardrails.length === 0,
  };
}
