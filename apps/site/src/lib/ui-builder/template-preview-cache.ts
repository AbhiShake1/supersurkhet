import type {
  ComponentLayer,
  UiTemplateInstallPreview,
} from '@/lib/plugins/types';

const PREVIEW_CACHE_LIMIT = 128;

type TemplatePreviewCacheEntry = {
  key: string;
  preview: UiTemplateInstallPreview;
  cachedAt: number;
};

export type TemplatePreviewCacheKeyInput = {
  businessId: string;
  templateId: string;
  version: string;
  layersHash: string;
};

const previewCache = new Map<string, TemplatePreviewCacheEntry>();

function fnv1a(input: string) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

export function hashTemplatePreviewLayers(layers: ComponentLayer[]) {
  return fnv1a(JSON.stringify(layers));
}

export function toTemplatePreviewCacheKey({
  businessId,
  templateId,
  version,
  layersHash,
}: TemplatePreviewCacheKeyInput) {
  return `${businessId}::${templateId}::${version}::${layersHash}`;
}

function evictOldestCacheEntry() {
  const oldest = previewCache.entries().next().value as
    | [string, TemplatePreviewCacheEntry]
    | undefined;
  if (!oldest) return;
  previewCache.delete(oldest[0]);
}

export function getTemplatePreviewFromCache(
  input: TemplatePreviewCacheKeyInput,
) {
  const key = toTemplatePreviewCacheKey(input);
  const cached = previewCache.get(key);
  if (!cached) return null;

  // Reinsert to keep recently-used entries warm.
  previewCache.delete(key);
  previewCache.set(key, cached);
  return cached.preview;
}

export function setTemplatePreviewInCache(
  input: TemplatePreviewCacheKeyInput,
  preview: UiTemplateInstallPreview,
) {
  const key = toTemplatePreviewCacheKey(input);
  if (previewCache.has(key)) {
    previewCache.delete(key);
  }
  previewCache.set(key, {
    key,
    preview,
    cachedAt: Date.now(),
  });
  if (previewCache.size > PREVIEW_CACHE_LIMIT) {
    evictOldestCacheEntry();
  }
}

export function clearTemplatePreviewCache() {
  previewCache.clear();
}
