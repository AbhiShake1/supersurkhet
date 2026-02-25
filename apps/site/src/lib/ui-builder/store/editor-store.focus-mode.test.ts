import { beforeEach, describe, expect, it } from 'vitest';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import { useEditorStore } from '@/lib/ui-builder/store/editor-store';

function layer(
  id: string,
  children: ComponentLayer[] = [],
  type = 'div',
): ComponentLayer {
  return {
    id,
    name: id,
    type,
    props: {},
    children,
  };
}

const pageTree = layer('page-root', [
  layer('section-a', [layer('button-a1', [], 'button')], 'section'),
  layer('section-b', [layer('button-b1', [], 'button')], 'section'),
]);

describe('editor-store focus mode', () => {
  beforeEach(() => {
    useEditorStore.getState().resetFocus();
  });

  it('pushes focus layers and trims stack when refocusing an ancestor', () => {
    const store = useEditorStore.getState();

    store.focusLayer('section-a');
    store.focusLayer('button-a1');
    expect(useEditorStore.getState().focusStack).toEqual([
      'section-a',
      'button-a1',
    ]);

    store.focusLayer('section-a');
    expect(useEditorStore.getState().focusStack).toEqual(['section-a']);
  });

  it('focusSelectedLayer ignores empty ids and focuses non-empty ids', () => {
    const store = useEditorStore.getState();

    store.focusSelectedLayer(null);
    store.focusSelectedLayer(undefined);
    expect(useEditorStore.getState().focusStack).toEqual([]);

    store.focusSelectedLayer('section-a');
    expect(useEditorStore.getState().focusStack).toEqual(['section-a']);
  });

  it('exitFocus pops one level and resetFocus always clears stack', () => {
    const store = useEditorStore.getState();

    store.focusLayer('section-a');
    store.focusLayer('button-a1');
    store.exitFocus();
    expect(useEditorStore.getState().focusStack).toEqual(['section-a']);

    store.exitFocus();
    expect(useEditorStore.getState().focusStack).toEqual([]);

    store.exitFocus();
    expect(useEditorStore.getState().focusStack).toEqual([]);

    store.focusLayer('section-b');
    store.resetFocus();
    expect(useEditorStore.getState().focusStack).toEqual([]);
  });

  it('computes effective canvas root from deepest valid focus stack entry', () => {
    const store = useEditorStore.getState();

    expect(store.getEffectiveCanvasRootId(pageTree)).toBe('page-root');

    store.focusLayer('section-a');
    store.focusLayer('button-a1');
    expect(store.getEffectiveCanvasRootId(pageTree)).toBe('button-a1');

    store.focusLayer('missing-node');
    expect(store.getEffectiveCanvasRootId(pageTree)).toBe('button-a1');
  });

  it('drops invalid sibling focus entries when resolving focus stack for a page', () => {
    const store = useEditorStore.getState();

    store.focusLayer('section-a');
    store.focusLayer('section-b');

    expect(store.getResolvedFocusStack(pageTree)).toEqual(['section-a']);
    expect(store.getEffectiveCanvasRootId(pageTree)).toBe('section-a');
  });

  it('scopes layer checks to the effective focused subtree', () => {
    const store = useEditorStore.getState();

    expect(store.isLayerInFocusScope(pageTree, 'section-a')).toBe(true);
    expect(store.isLayerInFocusScope(pageTree, 'page-root')).toBe(true);

    store.focusLayer('section-a');

    expect(store.isLayerInFocusScope(pageTree, 'section-a')).toBe(true);
    expect(store.isLayerInFocusScope(pageTree, 'button-a1')).toBe(true);
    expect(store.isLayerInFocusScope(pageTree, 'section-b')).toBe(false);
    expect(store.isLayerInFocusScope(pageTree, 'page-root')).toBe(false);
  });
});
