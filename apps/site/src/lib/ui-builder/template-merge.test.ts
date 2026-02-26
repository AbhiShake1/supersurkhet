import { describe, expect, it } from 'vitest';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import { mergeUiTemplateLayers } from '@/lib/ui-builder/template-merge';

function page(
  input: Partial<ComponentLayer> & Pick<ComponentLayer, 'id' | 'name'>,
): ComponentLayer {
  return {
    id: input.id,
    name: input.name,
    type: input.type ?? 'div',
    props: input.props ?? {},
    children: input.children ?? [],
  };
}

function node(
  input: Partial<ComponentLayer> & Pick<ComponentLayer, 'id' | 'type'>,
): ComponentLayer {
  return {
    id: input.id,
    name: input.name,
    type: input.type,
    props: input.props ?? {},
    children: input.children ?? [],
  };
}

describe('mergeUiTemplateLayers', () => {
  it('adds template-only pages', () => {
    const result = mergeUiTemplateLayers({
      targetLayers: [page({ id: 'p1', name: 'Home' })],
      templateLayers: [page({ id: 'p2', name: 'Pricing' })],
    });

    expect(result.hardConflicts).toHaveLength(0);
    expect(result.summary.pagesAdded).toBe(1);
    expect(result.layers).toHaveLength(2);
    expect(result.layers[1]?.name).toBe('Pricing');
  });

  it('merges matching pages recursively and preserves unmatched target nodes', () => {
    const result = mergeUiTemplateLayers({
      targetLayers: [
        page({
          id: 'home-target',
          name: 'Home',
          children: [
            node({
              id: 'hero',
              type: 'section',
              props: { title: 'Old title', color: 'blue' },
              children: [
                node({ id: 'cta', type: 'button', props: { text: 'Buy' } }),
              ],
            }),
            node({ id: 'target-only', type: 'p', props: { text: 'legacy' } }),
          ],
        }),
      ],
      templateLayers: [
        page({
          id: 'home-template',
          name: 'home',
          children: [
            node({
              id: 'hero',
              type: 'section',
              props: { title: 'New title' },
              children: [
                node({ id: 'new-child', type: 'span', props: { text: 'new' } }),
              ],
            }),
          ],
        }),
      ],
    });

    expect(result.hardConflicts).toHaveLength(0);
    expect(result.summary.pagesMerged).toBe(1);
    const mergedPage = result.layers[0];
    if (!mergedPage || !Array.isArray(mergedPage.children)) {
      throw new Error('Expected merged page children');
    }
    const mergedHero = mergedPage.children.find((child) => child.id === 'hero');
    expect(mergedHero?.props).toMatchObject({
      title: 'New title',
      color: 'blue',
    });
    const preserved = mergedPage.children.find(
      (child) => child.id === 'target-only',
    );
    expect(preserved).toBeTruthy();
  });

  it('fails with hard conflict when same id has different type', () => {
    const result = mergeUiTemplateLayers({
      targetLayers: [
        page({
          id: 'p1',
          name: 'Home',
          children: [node({ id: 'shared', type: 'div' })],
        }),
      ],
      templateLayers: [
        page({
          id: 'p2',
          name: 'Home',
          children: [node({ id: 'shared', type: 'button' })],
        }),
      ],
    });

    expect(result.hardConflicts).toHaveLength(1);
    expect(result.hardConflicts[0]?.code).toBe('id-type-mismatch');
    expect(result.layers[0]?.id).toBe('p1');
  });

  it('fails with hard conflict when same id has incompatible child shape', () => {
    const result = mergeUiTemplateLayers({
      targetLayers: [
        page({
          id: 'p1',
          name: 'Home',
          children: [node({ id: 'shared', type: 'div', children: [] })],
        }),
      ],
      templateLayers: [
        page({
          id: 'p2',
          name: 'Home',
          children: [node({ id: 'shared', type: 'div', children: 'content' })],
        }),
      ],
    });

    expect(result.hardConflicts).toHaveLength(1);
    expect(result.hardConflicts[0]?.code).toBe('children-shape-mismatch');
  });

  it('fails with hard conflict when duplicate ids exist in a page tree', () => {
    const result = mergeUiTemplateLayers({
      targetLayers: [page({ id: 'p1', name: 'Home' })],
      templateLayers: [
        page({
          id: 'p2',
          name: 'Home',
          children: [
            node({ id: 'dup', type: 'div' }),
            node({ id: 'dup', type: 'div' }),
          ],
        }),
      ],
    });

    expect(result.hardConflicts.length).toBeGreaterThan(0);
    expect(
      result.hardConflicts.some((conflict) => conflict.code === 'duplicate-id'),
    ).toBe(true);
  });
});
