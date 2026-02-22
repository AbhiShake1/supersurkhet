import isDeepEqual from 'fast-deep-equal';
import { type Id, useHeTree } from 'he-tree-react';
import { Plus } from 'lucide-react';
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
import { useLayerStore } from '@/lib/ui-builder/store/layer-store';
import {
  findAllParentLayersRecursive,
  hasLayerChildren,
} from '@/lib/ui-builder/store/layer-utils';
import { cn } from '@/lib/utils';

interface LayersPanelProps {
  className?: string;
}

const LayersPanel: React.FC<LayersPanelProps> = ({ className }) => {
  const selectedPageId = useLayerStore((state) => state.selectedPageId);
  const selectedLayerId = useLayerStore((state) => state.selectedLayerId);
  const pageLayer = useLayerStore((state) =>
    state.findLayerById(state.selectedPageId),
  );
  const updateLayer = useLayerStore((state) => state.updateLayer);
  const selectLayer = useLayerStore((state) => state.selectLayer);
  const removeLayer = useLayerStore((state) => state.removeLayer);
  const duplicateLayer = useLayerStore((state) => state.duplicateLayer);

  const layers = useMemo(() => [pageLayer as ComponentLayer], [pageLayer]);

  if (!pageLayer) {
    return null;
  }

  return (
    <LayersTree
      className={className}
      layers={layers}
      selectedPageId={selectedPageId}
      selectedLayerId={selectedLayerId}
      updateLayer={updateLayer}
      selectLayer={selectLayer}
      removeLayer={removeLayer}
      duplicateLayer={duplicateLayer}
    />
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
