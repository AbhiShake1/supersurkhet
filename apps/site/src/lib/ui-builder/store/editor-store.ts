import { create, type StateCreator } from 'zustand';
import type { ComponentType as ReactComponentType } from "react";
import type { RegistryEntry, ComponentRegistry } from '@/components/ui/ui-builder/types';

export interface EditorStore {
  previewMode: 'mobile' | 'tablet' | 'desktop' | 'responsive';
  setPreviewMode: (mode: 'mobile' | 'tablet' | 'desktop' | 'responsive') => void;

  registry: ComponentRegistry;

  initialize: (registry: ComponentRegistry, persistLayerStoreConfig: boolean, allowPagesCreation: boolean, allowPagesDeletion: boolean) => void;
  getComponentDefinition: (type: string) => RegistryEntry<ReactComponentType<any>> | undefined;

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
}

const store: StateCreator<EditorStore, [], []> = (set, get) => ({
  previewMode: 'responsive',
  setPreviewMode: (mode) => set({ previewMode: mode }),

  registry: {},

  initialize: (registry, persistLayerStoreConfig, allowPagesCreation, allowPagesDeletion) => {
    set(state => ({ ...state, registry, persistLayerStoreConfig, allowPagesCreation, allowPagesDeletion }));
  },
  getComponentDefinition: (type: string) => {
    const { registry } = get();
    if (!registry) {
      console.warn("Registry accessed via editor store before initialization.");
      return undefined;
    }
    return registry[type];
  },

  persistLayerStoreConfig: true,
  setPersistLayerStoreConfig: (shouldPersist) => set({ persistLayerStoreConfig: shouldPersist }),

  revisionCounter: 0,
  incrementRevision: () => set(state => ({ revisionCounter: state.revisionCounter + 1 })),

  allowPagesCreation: true,
  setAllowPagesCreation: (allow) => set({ allowPagesCreation: allow }),
  allowPagesDeletion: true,
  setAllowPagesDeletion: (allow) => set({ allowPagesDeletion: allow }),

  // Panel visibility state
  showLeftPanel: true,
  setShowLeftPanel: (show) => set({ showLeftPanel: show }),
  showRightPanel: true,
  setShowRightPanel: (show) => set({ showRightPanel: show }),
});

export const useEditorStore = create<EditorStore>()(store);
