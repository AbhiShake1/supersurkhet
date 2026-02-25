import isDeepEqual from 'fast-deep-equal';
import { type Id, useHeTree } from 'he-tree-react';
import { ChevronRight, Plus } from 'lucide-react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { buttonVariants } from '@/components/ui/button';
import { AddComponentsPopover } from '@/components/ui/ui-builder/internal/components/add-component-popover';
import { DevProfiler } from '@/components/ui/ui-builder/internal/components/dev-profiler';
import { DividerControl } from '@/components/ui/ui-builder/internal/components/divider-control';
import {
  TreeRowNode,
  TreeRowPlaceholder,
} from '@/components/ui/ui-builder/internal/components/tree-row-node';
import type { ComponentLayer } from '@/components/ui/ui-builder/types';
import { useEditorStore } from '@/lib/ui-builder/store/editor-store';
import { useLayerStore } from '@/lib/ui-builder/store/layer-store';
import {
  findAllParentLayersRecursive,
  hasLayerChildren,
} from '@/lib/ui-builder/store/layer-utils';
import { cn } from '@/lib/utils';

type FocusModeStoreSlice = {
  focusStack?: string[];
  focusLayer?: (layerId: string) => void;
  getEffectiveCanvasRootId?: (
    page: ComponentLayer | null | undefined,
  ) => string | null;
};

interface LayersPanelProps {
  className?: string;
}

const LayersPanel: React.FC<LayersPanelProps> = ({ className }) => {
  const selectedPageId = useLayerStore((state) => state.selectedPageId);
  const selectedLayerId = useLayerStore((state) => state.selectedLayerId);
  const pageLayer = useLayerStore((state) =>
    state.findLayerById(state.selectedPageId),
  );
  const findLayerById = useLayerStore((state) => state.findLayerById);
  const updateLayer = useLayerStore((state) => state.updateLayer);
  const selectLayer = useLayerStore((state) => state.selectLayer);
  const removeLayer = useLayerStore((state) => state.removeLayer);
  const duplicateLayer = useLayerStore((state) => state.duplicateLayer);
  const focusModeStore = useEditorStore(
    (state) => state as unknown as FocusModeStoreSlice,
  );

  const layers = useMemo(() => [pageLayer as ComponentLayer], [pageLayer]);
  const isFocusModeAvailable = typeof focusModeStore.focusLayer === 'function';

  const focusBreadcrumbs = useMemo(() => {
    if (!pageLayer) return [];
    const stack = focusModeStore.focusStack ?? [];
    const effectiveCanvasRootId =
      focusModeStore.getEffectiveCanvasRootId?.(pageLayer) ?? null;
    if (stack.length > 0) {
      const mapped = stack
        .map((layerId) => findLayerById(layerId))
        .filter(Boolean) as ComponentLayer[];
      return [pageLayer, ...mapped];
    }
    const focusedRootId = effectiveCanvasRootId;
    if (focusedRootId && focusedRootId !== selectedPageId) {
      const focusedRootLayer = findLayerById(focusedRootId);
      if (focusedRootLayer) {
        const parents = findAllParentLayersRecursive(layers, focusedRootId);
        return [pageLayer, ...parents, focusedRootLayer];
      }
    }
    const fallbackLayerId = selectedLayerId ?? selectedPageId;
    const fallbackLayer = findLayerById(fallbackLayerId);
    if (!fallbackLayer) return [pageLayer];
    const parents = findAllParentLayersRecursive(layers, fallbackLayerId);
    return [pageLayer, ...parents, fallbackLayer];
  }, [
    findLayerById,
    focusModeStore.focusStack,
    focusModeStore.getEffectiveCanvasRootId,
    layers,
    pageLayer,
    selectedLayerId,
    selectedPageId,
  ]);

  const onSelectBreadcrumb = useCallback(
    (layerId: string) => {
      if (isFocusModeAvailable) {
        focusModeStore.focusLayer?.(layerId);
      }
      selectLayer(layerId);
    },
    [focusModeStore, isFocusModeAvailable, selectLayer],
  );

  if (!pageLayer) {
    return null;
  }

  return (
    <div className={cn(className, 'flex h-full min-h-0 flex-col')}>
      <FocusBreadcrumbs
        items={focusBreadcrumbs}
        onSelect={onSelectBreadcrumb}
        focusModeAvailable={isFocusModeAvailable}
      />
      <LayersTree
        className="min-h-0 flex-1"
        layers={layers}
        selectedPageId={selectedPageId}
        selectedLayerId={selectedLayerId}
        updateLayer={updateLayer}
        selectLayer={selectLayer}
        removeLayer={removeLayer}
        duplicateLayer={duplicateLayer}
      />
    </div>
  );
};

interface LayersTreeProps {
  className?: string;
  layers: ComponentLayer[];
  selectedPageId: string;
  selectedLayerId: string | null;
  updateLayer: (
    layerId: string,
    // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
    newProps: Record<string, any>,
    layerRest?: Partial<Omit<ComponentLayer, 'props'>>,
  ) => void;
  selectLayer: (layerId: string) => void;
  removeLayer: (layerId: string) => void;
  duplicateLayer: (layerId: string) => void;
}

function FocusBreadcrumbs({
  items,
  onSelect,
  focusModeAvailable,
}: {
  items: ComponentLayer[];
  onSelect: (layerId: string) => void;
  focusModeAvailable: boolean;
}) {
  const uniqueItems = useMemo(() => {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  }, [items]);

  const renderLabel = useCallback((item: ComponentLayer, index: number) => {
    if (index === 0) return item.name || 'Page';
    return item.name || item.type || item.id;
  }, []);

  return (
    <div className="flex items-center gap-1 overflow-x-auto border-b border-border/60 bg-muted/20 px-2 py-1.5 text-xs">
      {uniqueItems.map((item, index) => (
        <React.Fragment key={`${item.id}-${index + 1}`}>
          {index > 0 ? (
            <ChevronRight className="size-3 shrink-0 text-muted-foreground/70" />
          ) : null}
          <button
            type="button"
            className={cn(
              buttonVariants({ variant: 'ghost', size: 'sm' }),
              'h-6 shrink-0 px-2 text-xs font-medium',
            )}
            onClick={() => onSelect(item.id)}
            title={
              focusModeAvailable
                ? 'Select and focus this layer'
                : 'Select this layer'
            }
          >
            <span className="truncate">{renderLabel(item, index)}</span>
          </button>
        </React.Fragment>
      ))}
    </div>
  );
}

export const LayersTree: React.FC<LayersTreeProps> = React.memo(
  ({
    className,
    layers,
    selectedPageId,
    selectedLayerId,
    updateLayer,
    selectLayer,
    removeLayer,
    duplicateLayer,
  }) => {
    const [userOpenIdsArray, setUserOpenIdsArray] = useState<Id[]>([]);

    const prevSelectedLayerId = useRef(selectedLayerId);

    const handleNodeToggle = useCallback((id: Id, open: boolean) => {
      setUserOpenIdsArray((prev) => {
        if (open) {
          return prev.includes(id) ? prev : [...prev, id];
        } else {
          return prev.filter((existingId) => existingId !== id);
        }
      });
    }, []);

    const handleChange = useCallback(
      (newLayers: unknown) => {
        if (Array.isArray(newLayers) && newLayers.length > 0) {
          const updatedPageLayer = newLayers[0] as ComponentLayer;

          // Validate the layer structure before updating
          if (
            !updatedPageLayer ||
            !updatedPageLayer.id ||
            updatedPageLayer.id !== selectedPageId
          ) {
            console.error(
              'LayersTree onChange: Invalid layer structure - ID mismatch',
              { updatedPageLayer, selectedPageId },
            );
            return;
          }

          const updatedChildren = hasLayerChildren(updatedPageLayer)
            ? updatedPageLayer.children || []
            : [];

          // Only update if children actually changed
          const currentLayer = layers[0];
          const currentChildren = hasLayerChildren(currentLayer)
            ? currentLayer.children || []
            : [];

          if (!isDeepEqual(currentChildren, updatedChildren)) {
            updateLayer(selectedPageId, {}, { children: updatedChildren });
          }
        } else {
          console.error(
            'LayersTree onChange: Invalid newLayers structure received',
            newLayers,
          );
        }
      },
      [updateLayer, selectedPageId, layers],
    );

    const handleDragOpen = useCallback(
      (stat: { node: ComponentLayer; id: Id }) => {
        if (hasLayerChildren(stat.node)) {
          handleNodeToggle(stat.id, true);
        }
      },
      [handleNodeToggle],
    );

    const canNodeDrop = useCallback((layer: { node: ComponentLayer }) => {
      const isDroppable = hasLayerChildren(layer.node);
      return isDroppable;
    }, []);

    const { processedLayers, originalLayerById } = useMemo(() => {
      const layerMap = new Map<string, ComponentLayer>();

      const processLayer = (layer: ComponentLayer): ComponentLayer => {
        layerMap.set(layer.id, layer);

        if (hasLayerChildren(layer)) {
          let hasChildChanges = false;
          const nextChildren = layer.children.map((child) => {
            const nextChild = processLayer(child);
            if (nextChild !== child) {
              hasChildChanges = true;
            }
            return nextChild;
          });

          if (!hasChildChanges) {
            return layer;
          }

          return { ...layer, children: nextChildren };
        }

        if (typeof layer.children === 'string' || !layer.children) {
          return { ...layer, children: [] };
        }

        return layer;
      };

      return {
        processedLayers: layers.map(processLayer),
        originalLayerById: layerMap,
      };
    }, [layers]);

    const selectedParentIds = useMemo<Id[]>(() => {
      if (!selectedLayerId) {
        return [];
      }
      return findAllParentLayersRecursive(layers, selectedLayerId).map(
        (layer) => layer.id,
      );
    }, [layers, selectedLayerId]);

    const openIdsArray = useMemo<Id[]>(() => {
      if (selectedParentIds.length === 0) {
        return userOpenIdsArray;
      }
      return Array.from(new Set([...userOpenIdsArray, ...selectedParentIds]));
    }, [userOpenIdsArray, selectedParentIds]);

    const renderNode = useCallback(
      // biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
      ({ stat, attrs, isPlaceholder }: any) => {
        // Use node.id as key to ensure stable identity across tree operations
        const stableKey = isPlaceholder
          ? `placeholder-${attrs.key}`
          : stat.node.id;

        if (isPlaceholder) {
          return <TreeRowPlaceholder key={stableKey} nodeAttributes={attrs} />;
        }

        const originalNode = originalLayerById.get(stat.node.id) || stat.node;

        return (
          <TreeRowNode
            key={stableKey}
            nodeAttributes={attrs}
            node={originalNode}
            id={stat.id}
            open={stat.open}
            draggable={stat.draggable}
            onToggle={handleNodeToggle}
            level={stat.level}
            selectLayer={selectLayer}
            removeLayer={removeLayer}
            duplicateLayer={duplicateLayer}
            updateLayer={updateLayer}
          />
        );
      },
      [
        handleNodeToggle,
        selectLayer,
        removeLayer,
        duplicateLayer,
        updateLayer,
        originalLayerById,
      ],
    );

    const data = useMemo(() => {
      return {
        data: processedLayers,
        dataType: 'tree' as const,
        childrenKey: 'children',
        openIds: openIdsArray,
        dragOpen: true,
        onChange: handleChange,
        renderNodeBox: renderNode,
        onDragOpen: handleDragOpen,
        canDrop: canNodeDrop,
      };
    }, [
      processedLayers,
      openIdsArray,
      handleChange,
      renderNode,
      handleDragOpen,
      canNodeDrop,
    ]);

    const { renderTree, scrollToNode } = useHeTree<ComponentLayer>(data);

    useEffect(() => {
      if (prevSelectedLayerId.current !== selectedLayerId) {
        prevSelectedLayerId.current = selectedLayerId;
        if (selectedLayerId) {
          const rafId = window.requestAnimationFrame(() => {
            scrollToNode(selectedLayerId);
          });
          return () => window.cancelAnimationFrame(rafId);
        }
      }
    }, [scrollToNode, selectedLayerId]);

    const buttonClass = useMemo(() => {
      return cn(
        buttonVariants({ variant: 'default', size: 'sm' }),
        'cursor-pointer w-full',
      );
    }, []);

    return (
      // biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup
      <DevProfiler id="LayersPanel" threshold={40}>
        <div
          data-testid="layers-tree"
          className={cn(
            className,
            'flex flex-col size-full overflow-x-auto pl-4',
          )}
        >
          {layers.length > 0 ? (
            <>
              <DividerControl
                className="border-l border-dashed border-primary"
                addPosition={0}
                parentLayerId={selectedPageId}
              />
              {renderTree()}
              <div className="relative">
                <div className="w-[1px] h-4 absolute left-0 bottom-0 border-l border-dashed border-primary bg-background" />
              </div>
              <DividerControl
                className="border-l border-dashed border-primary"
                parentLayerId={selectedPageId}
              />
            </>
          ) : (
            <AddComponentsPopover
              parentLayerId={selectedPageId}
              className="w-full mt-4"
            >
              <div className={buttonClass}>
                <span className="sr-only">Add Component</span>
                <Plus className="h-5 w-5" />
                <span>Add Component</span>
              </div>
            </AddComponentsPopover>
          )}
        </div>
      </DevProfiler>
    );
  },
  (prevProps, nextProps) => {
    return (
      isDeepEqual(prevProps.layers, nextProps.layers) &&
      prevProps.selectedPageId === nextProps.selectedPageId &&
      prevProps.selectedLayerId === nextProps.selectedLayerId &&
      prevProps.className === nextProps.className
    );
  },
);

LayersTree.displayName = 'LayersTree';

export default LayersPanel;
