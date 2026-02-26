'use client';

import { useEffect, useId, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  type ShortcutDefinition,
  ShortcutKbd,
  useShortcutAction,
} from '@/components/ui/keyboard-shortcuts';
import { Textarea } from '@/components/ui/textarea';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import {
  DEFAULT_TEMPLATE_PUBLISH_DRAFT,
  getTemplatePublishDraftStorageKey,
  readTemplatePublishDraft,
  type TemplatePublishDraft,
  writeTemplatePublishDraft,
} from './template-publish-draft-store';
import {
  collectSuggestedPublishTags,
  getTemplatePublishGuardrails,
  slugifyTemplateSlug,
} from './template-publish-guardrails';

type TemplatePublishPanelProps = {
  businessId: string;
  layers: ComponentLayer[];
  availableCategories: string[];
  isPublishLoading: boolean;
  publishedRef: string;
  publishShortcut: ShortcutDefinition;
  isActive: boolean;
  onPublish: (draft: TemplatePublishDraft) => void;
  onOpenPublishedTemplate: (templateId: string) => void;
};

export function TemplatePublishPanel({
  businessId,
  layers,
  availableCategories,
  isPublishLoading,
  publishedRef,
  publishShortcut,
  isActive,
  onPublish,
  onOpenPublishedTemplate,
}: TemplatePublishPanelProps) {
  const [publishDraft, setPublishDraft] = useState<TemplatePublishDraft>(
    DEFAULT_TEMPLATE_PUBLISH_DRAFT,
  );
  const [slugTouched, setSlugTouched] = useState(false);
  const [hasHydratedDraft, setHasHydratedDraft] = useState(false);
  const categoryDatalistId = useId();

  const draftStorageKey = getTemplatePublishDraftStorageKey(businessId);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const parsed = readTemplatePublishDraft(
      window.localStorage,
      draftStorageKey,
    );
    if (parsed) {
      setPublishDraft((current) => ({
        ...current,
        ...parsed,
      }));

      if (parsed.templateSlug?.trim()) {
        setSlugTouched(true);
      }
    }
    setHasHydratedDraft(true);
  }, [draftStorageKey]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    if (!hasHydratedDraft) {
      return;
    }
    writeTemplatePublishDraft(
      window.localStorage,
      draftStorageKey,
      publishDraft,
    );
  }, [draftStorageKey, publishDraft, hasHydratedDraft]);

  const suggestedTags = useMemo(
    () => collectSuggestedPublishTags(layers),
    [layers],
  );

  const publishChecks = useMemo(
    () => getTemplatePublishGuardrails(publishDraft, layers),
    [publishDraft, layers],
  );

  useShortcutAction(
    publishShortcut,
    () => {
      if (!publishChecks.canPublish || isPublishLoading) {
        return;
      }
      onPublish(publishDraft);
    },
    {
      enabled: isActive,
      allowInEditableContext: true,
    },
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-md border p-2">
          <p className="text-muted-foreground">Pages to snapshot</p>
          <p className="font-semibold">{layers.length}</p>
        </div>
        <div className="rounded-md border p-2">
          <p className="text-muted-foreground">Suggested tags</p>
          <p className="font-semibold">{suggestedTags.length}</p>
        </div>
      </div>

      <div
        className={
          publishChecks.canPublish
            ? 'rounded-md border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs text-emerald-900'
            : 'rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-900'
        }
      >
        <p className="font-medium">
          {publishChecks.canPublish
            ? 'Ready to publish'
            : `Resolve ${publishChecks.guardrails.length} guardrail${publishChecks.guardrails.length === 1 ? '' : 's'} before publishing`}
        </p>
        {publishChecks.guardrails.length > 0 && (
          <ul className="mt-1 space-y-1">
            {publishChecks.guardrails.map((guardrail) => (
              <li key={guardrail.id}>{guardrail.message}</li>
            ))}
          </ul>
        )}
      </div>

      <Input
        value={publishDraft.templateSlug}
        onChange={(event) => {
          setSlugTouched(true);
          setPublishDraft((current) => ({
            ...current,
            templateSlug: slugifyTemplateSlug(event.target.value),
          }));
        }}
        placeholder="Template slug (e.g. starter)"
      />
      <Input
        value={publishDraft.title}
        onChange={(event) => {
          const nextTitle = event.target.value;
          setPublishDraft((current) => ({
            ...current,
            title: nextTitle,
            templateSlug: slugTouched
              ? current.templateSlug
              : slugifyTemplateSlug(nextTitle) || current.templateSlug,
          }));
        }}
        placeholder="Template title"
      />
      <Textarea
        value={publishDraft.description}
        onChange={(event) =>
          setPublishDraft((current) => ({
            ...current,
            description: event.target.value,
          }))
        }
        placeholder="Template description"
      />
      <Input
        value={publishDraft.category}
        onChange={(event) =>
          setPublishDraft((current) => ({
            ...current,
            category: event.target.value,
          }))
        }
        placeholder="Category (optional)"
        list={categoryDatalistId}
      />
      <datalist id={categoryDatalistId}>
        {availableCategories.map((category) => (
          <option key={category} value={category} />
        ))}
      </datalist>
      <Input
        value={publishDraft.tags}
        onChange={(event) =>
          setPublishDraft((current) => ({
            ...current,
            tags: event.target.value,
          }))
        }
        placeholder="Tags comma-separated (optional)"
      />

      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={suggestedTags.length === 0}
          onClick={() =>
            setPublishDraft((current) => ({
              ...current,
              tags: suggestedTags.join(', '),
            }))
          }
        >
          Use page names as tags
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setPublishDraft(DEFAULT_TEMPLATE_PUBLISH_DRAFT);
            setSlugTouched(false);
          }}
        >
          Reset form
        </Button>
      </div>

      <Button
        onClick={() => onPublish(publishDraft)}
        disabled={isPublishLoading || !publishChecks.canPublish}
        className="w-full"
      >
        {isPublishLoading ? 'Publishing...' : 'Publish Template'}
      </Button>
      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
        <span>Publish shortcut</span>
        <ShortcutKbd actionId={publishShortcut.id} interactive={false} />
      </div>

      {publishedRef && (
        <div className="rounded-md border p-3 text-sm">
          <p className="font-medium">Published</p>
          <p className="text-muted-foreground break-all">{publishedRef}</p>
          <div className="mt-2 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(publishedRef);
                toast.success('Template reference copied');
              }}
            >
              Copy Reference
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const [templateId] = publishedRef.split('@');
                if (templateId) {
                  onOpenPublishedTemplate(templateId);
                }
              }}
            >
              Open in Marketplace
            </Button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant="secondary">Quick follow-up</Badge>
            <span className="text-xs text-muted-foreground">
              Copy the reference or jump directly to marketplace selection.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
