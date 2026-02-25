import { beforeEach, describe, expect, it } from 'vitest';
import type { UiTemplateInstallPreview } from '@/lib/plugins/types';
import {
  clearTemplatePreviewCache,
  getTemplatePreviewFromCache,
  hashTemplatePreviewLayers,
  setTemplatePreviewInCache,
  toTemplatePreviewCacheKey,
  type TemplatePreviewCacheKeyInput,
} from './template-preview-cache';

function preview(version: string): UiTemplateInstallPreview {
  return {
    templateId: 'acme/site/starter',
    version,
    mergeSummary: {
      pagesAdded: 1,
      pagesMerged: 0,
      hardConflicts: 0,
    },
    pluginPlan: {
      install: [],
      update: [],
      noOp: [],
    },
    hardConflicts: [],
    requiresPluginUpdateConfirmation: false,
  };
}

function cacheKey(
  input: Partial<TemplatePreviewCacheKeyInput> = {},
): TemplatePreviewCacheKeyInput {
  return {
    businessId: 'business-1',
    templateId: 'acme/site/starter',
    version: '1.0.0',
    layersHash: 'hash-1',
    ...input,
  };
}

describe('template preview cache', () => {
  beforeEach(() => {
    clearTemplatePreviewCache();
  });

  it('keys cache by business/template/version/layers hash', () => {
    const keyA = toTemplatePreviewCacheKey(cacheKey());
    const keyB = toTemplatePreviewCacheKey(cacheKey({ version: '1.0.1' }));
    const keyC = toTemplatePreviewCacheKey(cacheKey({ layersHash: 'hash-2' }));
    expect(keyA).toBe('business-1::acme/site/starter::1.0.0::hash-1');
    expect(keyA).not.toBe(keyB);
    expect(keyA).not.toBe(keyC);
  });

  it('updates cached preview when the same key is written again', () => {
    const key = cacheKey();
    setTemplatePreviewInCache(key, preview('1.0.0'));
    setTemplatePreviewInCache(key, preview('1.0.0-hotfix'));
    expect(getTemplatePreviewFromCache(key)?.version).toBe('1.0.0-hotfix');
  });

  it('keeps cache buckets isolated across versions even with same layers hash', () => {
    const v1 = cacheKey({ version: '1.0.0', layersHash: 'same-hash' });
    const v2 = cacheKey({ version: '1.0.1', layersHash: 'same-hash' });
    setTemplatePreviewInCache(v1, preview('1.0.0'));
    setTemplatePreviewInCache(v2, preview('1.0.1'));
    expect(getTemplatePreviewFromCache(v1)?.version).toBe('1.0.0');
    expect(getTemplatePreviewFromCache(v2)?.version).toBe('1.0.1');
  });

  it('evicts oldest cache entry once capacity is exceeded and preserves MRU entries', () => {
    for (let index = 0; index < 128; index += 1) {
      setTemplatePreviewInCache(
        cacheKey({
          templateId: `acme/site/template-${index}`,
          layersHash: `hash-${index}`,
        }),
        preview(`1.0.${index}`),
      );
    }

    // Promote the oldest key to most recently used before overflow.
    const promoted = cacheKey({
      templateId: 'acme/site/template-0',
      layersHash: 'hash-0',
    });
    expect(getTemplatePreviewFromCache(promoted)?.version).toBe('1.0.0');

    setTemplatePreviewInCache(
      cacheKey({
        templateId: 'acme/site/template-128',
        layersHash: 'hash-128',
      }),
      preview('1.0.128'),
    );

    // template-1 is now the oldest and should be evicted.
    expect(
      getTemplatePreviewFromCache(
        cacheKey({
          templateId: 'acme/site/template-1',
          layersHash: 'hash-1',
        }),
      ),
    ).toBeNull();
    expect(getTemplatePreviewFromCache(promoted)?.version).toBe('1.0.0');
    expect(
      getTemplatePreviewFromCache(
        cacheKey({
          templateId: 'acme/site/template-128',
          layersHash: 'hash-128',
        }),
      )?.version,
    ).toBe('1.0.128');
  });

  it('produces stable layer hash for identical snapshots and different hash for changed snapshots', () => {
    const hashA = hashTemplatePreviewLayers([
      {
        id: 'page-home',
        name: 'Home',
        type: 'div',
        props: { title: 'A' },
        children: [],
      },
    ]);
    const hashB = hashTemplatePreviewLayers([
      {
        id: 'page-home',
        name: 'Home',
        type: 'div',
        props: { title: 'A' },
        children: [],
      },
    ]);
    const hashC = hashTemplatePreviewLayers([
      {
        id: 'page-home',
        name: 'Home',
        type: 'div',
        props: { title: 'B' },
        children: [],
      },
    ]);

    expect(hashA).toBe(hashB);
    expect(hashA).not.toBe(hashC);
  });
});

