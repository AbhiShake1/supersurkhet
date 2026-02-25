// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/auth-provider', () => ({
  useAuth: () => ({
    isAuthenticated: true,
  }),
}));
vi.mock('@/lib/ai-policy/ai-surface-gates', () => ({
  evaluateAiSurfaceGate: () => ({
    allowed: true,
    message: '',
  }),
}));
vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));
vi.mock('@/lib/gun', () => ({
  gun: {},
}));

import {
  findLayerPath,
  isLayerInsideSubtree,
  sanitizeFocusStack,
  UI_BUILDER_FOCUS_SHORTCUTS,
} from '@/components/ui/ui-builder/internal/editor-panel';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import { useLayerStore } from '@/lib/ui-builder/store/layer-store';

function createTree(): ComponentLayer {
  return {
    id: 'page',
    type: 'div',
    name: 'Page',
    props: {},
    children: [
      {
        id: 'focus',
        type: 'div',
        name: 'Focus',
        props: {},
        children: [
          {
            id: 'leaf',
            type: 'div',
            name: 'Leaf',
            props: {},
            children: [],
          },
        ],
      },
      {
        id: 'outside',
        type: 'div',
        name: 'Outside',
        props: {},
        children: [],
      },
    ],
  };
}

describe('UI Builder focus mode integration', () => {
  beforeEach(() => {
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      value: {
        getItem: () => null,
        setItem: () => {},
        removeItem: () => {},
      },
    });
  });

  it('derives focus path and sanitizes invalid stack entries', () => {
    const page = createTree();

    const pathToLeaf = findLayerPath(page, 'leaf').map((layer) => layer.id);
    expect(pathToLeaf).toEqual(['page', 'focus', 'leaf']);

    expect(isLayerInsideSubtree(page, 'outside')).toBe(true);
    expect(isLayerInsideSubtree(page.children[0], 'outside')).toBe(false);

    expect(sanitizeFocusStack(page, ['focus', 'leaf', 'outside'])).toEqual([
      'focus',
      'leaf',
      'outside',
    ]);
    expect(sanitizeFocusStack(page, ['missing', 'leaf'])).toEqual([]);
  });

  it('keeps full tree persistence when editing while focused', () => {
    const page = createTree();

    useLayerStore.getState().initialize([page], 'page', 'focus');

    const focusedRootPath = findLayerPath(page, 'focus');
    expect(focusedRootPath.map((layer) => layer.id)).toEqual(['page', 'focus']);

    // This mirrors focused props editing: update target inside focused subtree,
    // then verify full page tree still contains siblings and edited subtree state.
    useLayerStore
      .getState()
      .updateLayer('focus', { className: 'focused-tree', role: 'region' });

    const updatedFocus = useLayerStore.getState().findLayerById('focus');
    const outsideSibling = useLayerStore.getState().findLayerById('outside');

    expect(updatedFocus?.props.className).toBe('focused-tree');
    expect(updatedFocus?.props.role).toBe('region');
    expect(outsideSibling?.id).toBe('outside');
  });

  it('exposes keyboard and command parity shortcut contracts', () => {
    const focusShortcuts = Object.values(UI_BUILDER_FOCUS_SHORTCUTS);
    const shortcutIds = focusShortcuts.map((shortcut) => shortcut.id);

    expect(shortcutIds).toEqual([
      'uiBuilder.focus.openCommandPalette',
      'uiBuilder.focus.focusSelected',
      'uiBuilder.focus.exitFocus',
      'uiBuilder.focus.resetFocus',
    ]);

    expect(new Set(shortcutIds).size).toBe(focusShortcuts.length);
    expect(
      UI_BUILDER_FOCUS_SHORTCUTS.focusSelected.defaultBinding,
    ).toMatchObject({
      key: 'f',
      meta: true,
      shift: true,
    });
    expect(UI_BUILDER_FOCUS_SHORTCUTS.exitFocus.defaultBinding).toMatchObject({
      key: 'Escape',
    });
  });
});
