import React, { memo, Suspense, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import isDeepEqual from "fast-deep-equal";

import { ElementSelector } from "@/components/ui/ui-builder/internal/components/element-selector";
import { DropPlaceholder } from "@/components/ui/ui-builder/internal/dnd/drop-zone";
import { useDndContext } from "@/lib/ui-builder/context/dnd-context";
import { ErrorBoundary } from "react-error-boundary";

import { ErrorFallback } from "@/components/ui/ui-builder/internal/components/error-fallback";
import { isPrimitiveComponent } from "@/lib/ui-builder/store/editor-utils";
import { hasLayerChildren, canLayerAcceptChildren } from "@/lib/ui-builder/store/layer-utils";
import { DevProfiler } from "@/components/ui/ui-builder/internal/components/dev-profiler";
import type { ComponentRegistry, ComponentLayer, Variable, PropValue } from '@/components/ui/ui-builder/types';
import { useLayerStore } from "@/lib/ui-builder/store/layer-store";
import { useEditorStore } from "@/lib/ui-builder/store/editor-store";
import { resolveVariableReferences, resolveContextualMentions } from "@/lib/ui-builder/utils/variable-resolver";
import { useContextData } from "@/lib/ui-builder/context/context-data-store";

// Custom hook to safely use DND context
const useSafeDndContext = () => {
  try {
    return useDndContext();
  } catch {
    return null; // Not inside DndContextProvider
  }
};

const Wrapper = React.forwardRef<any, {
  props: any,
  element: any
  wrappedRefs: React.MutableRefObject<Record<string, any>>
  _layerId?: string
}>(
  ({ props, wrappedRefs, _layerId, element: Element }, ref) => {
    const contextData = useContextData()?.context
    useEffect(() => {
      if (_layerId)
        wrappedRefs.current[_layerId] = contextData;
    }, [contextData, _layerId])
    React.useImperativeHandle(ref, () => ({
      contextdata: contextData,
    }))

    return <div className="wrapper">
      <Element {...props} ref={ref} />
    </div>;
  }
);


export interface EditorConfig {
  zIndex: number;
  totalLayers: number;
  selectedLayer: ComponentLayer;
  parentUpdated?: boolean;
  onSelectElement: (layerId: string) => void;
  handleDuplicateLayer?: () => void;
  handleDeleteLayer?: () => void;
  contextData?: Record<string, any>;
}

export const RenderLayer: React.FC<{
  layer: ComponentLayer;
  componentRegistry: ComponentRegistry;
  editorConfig?: EditorConfig;
  variables?: Variable[];
  variableValues?: Record<string, PropValue>;
}> = memo(
  ({ layer, componentRegistry, editorConfig, variables, variableValues }) => {
    const storeVariables = useLayerStore((state) => state.variables);
    const isLayerAPage = useLayerStore((state) => state.isLayerAPage(layer.id));
    const registry = useEditorStore((state) => state.registry);
    const dndContext = useSafeDndContext();

    // Use provided variables or fall back to store variables
    const effectiveVariables = variables || storeVariables;
    const componentDefinition =
      componentRegistry[layer.type as keyof typeof componentRegistry];

    const prevLayer = useRef(layer);

    const infoData = useMemo(() => ({
      layerType: layer.type,
      layerId: layer.id,
      layerName: layer.name,
      availableComponents: Object.keys(componentRegistry),
      layer: layer
    }), [layer, componentRegistry]);

    // Resolve variable references in pops with proper memoization
    const resolvedProps = useMemo(() =>
      // mark here
      resolveVariableReferences(layer.props, effectiveVariables, variableValues, {}),
      [layer.props, effectiveVariables, variableValues]
    );

    // Also resolve contextual mentions in layer children if it's a string
    const resolvedChildren = useMemo(() => {
      // mark here
      if (typeof layer.children === 'string') {
        // Process string children for contextual mentions
        return resolveContextualMentions(layer.children, {});
      }
      return layer.children;
    }, [layer.children]);

    const childProps: Record<string, PropValue> = useMemo(() => ({
      ...resolvedProps,
      // Update children if it was a string that got processed
      ...(typeof layer.children === 'string' ? { children: resolvedChildren } : {})
    }), [resolvedProps, resolvedChildren]);

    // Memoize child editor config to avoid creating objects in JSX
    const childEditorConfig = useMemo(() => {
      return editorConfig
        ? { ...editorConfig, zIndex: editorConfig.zIndex + 1, parentUpdated: editorConfig.parentUpdated || !isDeepEqual(prevLayer.current, layer) }
        : undefined;
    }, [editorConfig, layer]);

    // Check if this layer can accept children and if drag is active (must be before early returns)
    const canAcceptChildren = useMemo(() => canLayerAcceptChildren(layer, registry), [layer, registry]);
    const showDropZones = useMemo(() =>
      editorConfig && dndContext?.isDragging && canAcceptChildren,
      [editorConfig, dndContext?.isDragging, canAcceptChildren]
    );

    if (!componentDefinition) {
      console.error(
        `[UIBuilder] Component definition not found in registry:`,
        infoData
      );
      return null;
    }

    let Component: React.ElementType | undefined =
      componentDefinition.component;
    let isPrimitive = false;
    if (isPrimitiveComponent(componentDefinition)) {
      Component = layer.type as keyof JSX.IntrinsicElements;
      isPrimitive = true;
    }

    if (!Component) return null;

    // Handle children rendering with improved drop zones
    if (hasLayerChildren(layer) && layer.children.length > 0) {
      const childElements = layer.children.map((child, index) => {
        const childElement = (
          <RenderLayer
            key={child.id}
            componentRegistry={componentRegistry}
            layer={child}
            variables={variables}
            variableValues={variableValues}
            editorConfig={childEditorConfig}
          />
        );

        // For drop zones, we create a wrapper that allows absolute positioning
        if (showDropZones) {
          return (
            <div key={child.id} className="relative">
              <DropPlaceholder
                parentId={layer.id}
                position={index}
                isActive={true}
              />
              {childElement}
            </div>
          );
        }

        return childElement;
      });

      // Add drop zone after the last child using a similar wrapper approach
      if (showDropZones) {
        const lastDropZone = (
          <div key={`drop-${layer.id}-${layer.children.length}`} className="relative">
            <DropPlaceholder
              parentId={layer.id}
              position={layer.children.length}
              isActive={true}
            />
          </div>
        );
        childElements.push(lastDropZone);
      }

      childProps.children = childElements;
    } else if (typeof layer.children === "string") {
      // Use the resolved children we processed earlier
      childProps.children = resolvedChildren;
    } else if (showDropZones && hasLayerChildren(layer)) {
      // Show drop zone for empty containers
      childProps.children = (
        <div className="relative min-h-[2rem]">
          <DropPlaceholder
            parentId={layer.id}
            position={0}
            isActive={true}
          />
        </div>
      );
    }

    const ref = React.useRef<any>(null);

    const componentChildProps = useMemo(() => {
      // If contextData is not already provided via props, inject it from editorConfig
      if (!childProps.contextData) {
        return {
          ...childProps,
          contextData: editorConfig?.contextData
        };
      }
      return childProps;
    }, [childProps, editorConfig?.contextData, layer.type]);

    function WrappedComponentChild() {
      return isPrimitive ? (
        // @ts-expect-error
        <Component ref={ref} id={layer.id} data-testid={layer.id} data-layer-id={layer.id} {...componentChildProps} />
      ) : (
        <ErrorSuspenseWrapper key={layer.id} id={layer.id}>
          {
            // @ts-expect-error
            <Component ref={ref} data-testid={layer.id} data-layer-id={layer.id} {...componentChildProps} />
          }
        </ErrorSuspenseWrapper>
      );
    }

    const addContextsForLayers = useLayerStore((state) => state.addContextsForLayers);

    const wrappedRefs = useRef<Record<string, Record<string, any>>>({});

    const WrappedComponent = <Wrapper _layerId={layer.id} wrappedRefs={wrappedRefs} props={componentChildProps} element={WrappedComponentChild} ref={ref} />;

    // after all wrapped components are created, add them to the store at once
    useEffect(() => {
      if (layer.children.length > 0) {
        addContextsForLayers(wrappedRefs.current);
      }
    }, [layer.children, addContextsForLayers]);

    if (!editorConfig) {
      return WrappedComponent;
    } else {
      const {
        zIndex,
        totalLayers,
        selectedLayer,
        onSelectElement,
        handleDuplicateLayer,
        handleDeleteLayer,
      } = editorConfig;

      return (
        <DevProfiler
          id={layer.type}
          threshold={20}
        >
          <ElementSelector
            key={layer.id}
            layer={layer}
            zIndex={zIndex}
            isSelected={layer.id === selectedLayer?.id}
            onSelectElement={onSelectElement}
            isPageLayer={isLayerAPage}
            totalLayers={totalLayers}
            onDuplicateLayer={handleDuplicateLayer}
            onDeleteLayer={handleDeleteLayer}
          >
            {WrappedComponent}
          </ElementSelector>
        </DevProfiler>
      );
    }
  },
  (prevProps, nextProps) => {
    if (nextProps.editorConfig?.parentUpdated) {
      return false;
    }
    const editorConfigEqual = isDeepEqual(
      prevProps.editorConfig?.selectedLayer?.id,
      nextProps.editorConfig?.selectedLayer?.id
    );
    const layerEqual = isDeepEqual(prevProps.layer, nextProps.layer);
    return editorConfigEqual && layerEqual;
  }
);

RenderLayer.displayName = "RenderLayer";

const ErrorSuspenseWrapper: React.FC<{
  id: string;
  children: React.ReactNode;
}> = ({ children }) => {
  const loadingFallback = useMemo(() => <LoadingComponent />, []);

  return (
    <ErrorBoundary fallbackRender={ErrorFallback}>
      <Suspense fallback={loadingFallback}>{children}</Suspense>
    </ErrorBoundary>
  );
};

const LoadingComponent: React.FC = () => (
  <div>Loading...</div>
);

