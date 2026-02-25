import type { ComponentType as ReactComponentType } from 'react';
import { create, type StateCreator } from 'zustand';
import type {
  ComponentLayer,
  ComponentRegistry,
  RegistryEntry,
} from '@/components/ui/ui-builder/types';
import {
  getEffectiveCanvasRootId,
  isLayerInFocusedSubtree,
  resolveFocusStackForPage,
} from '@/lib/ui-builder/store/editor-utils';

export interface EditorStore {
  previewMode: 'mobile' | 'tablet' | 'desktop' | 'responsive';
  setPreviewMode: (
    mode: 'mobile' | 'tablet' | 'desktop' | 'responsive',
  ) => void;

  registry: ComponentRegistry;

  initialize: (
    registry: ComponentRegistry,
    persistLayerStoreConfig: boolean,
    allowPagesCreation: boolean,
    allowPagesDeletion: boolean,
  ) => void;
  getComponentDefinition: (
    type: string,
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
  ) => RegistryEntry<ReactComponentType<any>> | undefined;

  persistLayerStoreConfig: boolean;
  setPersistLayerStoreConfig: (shouldPersist: boolean) => void;

  // Revision counter to track state changes for form revalidation
  revisionCounter: number;
  incrementRevision: () => void;

  allowPagesCreation: boolean;
  setAllowPagesCreation: (allow: boolean) => void;
  allowPagesDeletion: boolean;
  setAllowPagesDeletion: (allow: boolean) => void;

  // Panel visibility state
  showLeftPanel: boolean;
  setShowLeftPanel: (show: boolean) => void;
  showRightPanel: boolean;
  setShowRightPanel: (show: boolean) => void;

  focusStack: string[];
  setFocusStack: (stack: string[]) => void;
  focusSelectedLayer: (selectedLayerId: string | null | undefined) => void;
  focusLayer: (layerId: string) => void;
  exitFocus: () => void;
  resetFocus: () => void;
  getResolvedFocusStack: (page: ComponentLayer | null | undefined) => string[];
  getEffectiveCanvasRootId: (
    page: ComponentLayer | null | undefined,
  ) => string | null;
  isLayerInFocusScope: (
    page: ComponentLayer | null | undefined,
    layerId: string | null | undefined,
  ) => boolean;
}

const store: StateCreator<EditorStore, [], []> = (set, get) => ({
  previewMode: 'responsive',
  setPreviewMode: (mode) => set({ previewMode: mode }),

  registry: {},

  initialize: (
    registry,
    persistLayerStoreConfig,
    allowPagesCreation,
    allowPagesDeletion,
  ) => {
    set((state) => ({
      ...state,
      registry,
      persistLayerStoreConfig,
      allowPagesCreation,
      allowPagesDeletion,
    }));
  },
  getComponentDefinition: (type: string) => {
    const { registry } = get();
    if (!registry) {
      console.warn('Registry accessed via editor store before initialization.');
      return undefined;
    }
    return registry[type];
  },

  persistLayerStoreConfig: true,
  setPersistLayerStoreConfig: (shouldPersist) =>
    set({ persistLayerStoreConfig: shouldPersist }),

  revisionCounter: 0,
  incrementRevision: () =>
    set((state) => ({ revisionCounter: state.revisionCounter + 1 })),

  allowPagesCreation: true,
  setAllowPagesCreation: (allow) => set({ allowPagesCreation: allow }),
  allowPagesDeletion: true,
  setAllowPagesDeletion: (allow) => set({ allowPagesDeletion: allow }),

  // Panel visibility state
  showLeftPanel: true,
  setShowLeftPanel: (show) => set({ showLeftPanel: show }),
  showRightPanel: true,
  setShowRightPanel: (show) => set({ showRightPanel: show }),

  focusStack: [],
  setFocusStack: (stack) =>
    set((state) => {
      const nextStack = Array.isArray(stack)
        ? stack.filter((item) => typeof item === 'string' && item.length > 0)
        : [];
      const isSameStack =
        state.focusStack.length === nextStack.length &&
        state.focusStack.every((value, index) => value === nextStack[index]);
      if (isSameStack) {
        return state;
      }
      return { focusStack: nextStack };
    }),
  focusSelectedLayer: (selectedLayerId) => {
    if (!selectedLayerId) {
      return;
    }
    get().focusLayer(selectedLayerId);
  },
  focusLayer: (layerId) =>
    set((state) => {
      if (!layerId) {
        return state;
      }

      const existingFocusIndex = state.focusStack.indexOf(layerId);
      if (existingFocusIndex >= 0) {
        return {
          focusStack: state.focusStack.slice(0, existingFocusIndex + 1),
        };
      }

      return {
        focusStack: [...state.focusStack, layerId],
      };
    }),
  exitFocus: () =>
    set((state) => ({
      focusStack:
        state.focusStack.length > 0
          ? state.focusStack.slice(0, -1)
          : state.focusStack,
    })),
  resetFocus: () =>
    set((state) => {
      if (state.focusStack.length === 0) {
        return state;
      }
      return { focusStack: [] };
    }),
  getResolvedFocusStack: (page) =>
    resolveFocusStackForPage(page, get().focusStack),
  getEffectiveCanvasRootId: (page) =>
    getEffectiveCanvasRootId(page, get().focusStack),
  isLayerInFocusScope: (page, layerId) =>
    isLayerInFocusedSubtree(page, get().focusStack, layerId),
});

export const useEditorStore = create<EditorStore>()(store);
