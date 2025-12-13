import React, { memo, Suspense, useMemo, useRef } from "react";
import isDeepEqual from "fast-deep-equal";

import { ElementSelector } from "@/components/ui/ui-builder/internal/components/element-selector";
import { DropPlaceholder } from "@/components/ui/ui-builder/internal/dnd/drop-zone";
import { useDndContext } from "@/lib/ui-builder/context/dnd-context";
import { ErrorBoundary } from "react-error-boundary";

import { ErrorFallback } from "@/components/ui/ui-builder/internal/components/error-fallback";
import { isPrimitiveComponent } from "@/lib/ui-builder/store/editor-utils";
import { hasLayerChildren, canLayerAcceptChildren } from "@/lib/ui-builder/store/layer-utils";
import { DevProfiler } from "@/components/ui/ui-builder/internal/components/dev-profiler";
import type { ComponentRegistry, ComponentLayer, PropValue } from '@/components/ui/ui-builder/types';
import { useLayerStore } from "@/lib/ui-builder/store/layer-store";
import { useEditorStore } from "@/lib/ui-builder/store/editor-store";
import { resolveContextualMentions } from "@/lib/ui-builder/utils/variable-resolver";
import { useContextData } from "@/lib/ui-builder/context/context-data-store";

// Custom hook to safely use DND context
const useSafeDndContext = () => {
  try {
    return useDndContext();
  } catch {
    return null; // Not inside DndContextProvider
  }
};

function resolveStringsDeep(
  value: any,
  contextData: any
): any {
  // Resolve strings
  if (typeof value === "string") {
    return resolveContextualMentions(value, contextData);
  }

  // Primitives / non-resolvable
  if (
    value == null ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "function" ||
    typeof value === "symbol"
  ) {
    return value;
  }

  // Never touch React elements
  if (React.isValidElement(value)) {
    return value;
  }

  // Arrays
  if (Array.isArray(value)) {
    return value.map(v => resolveStringsDeep(v, contextData));
  }

  // Plain objects
  if (typeof value === "object") {
    const out: Record<string, any> = {};
    for (const key in value) {
      out[key] = resolveStringsDeep(value[key], contextData);
    }
    return out;
  }

  return value;
}

const Wrapper = React.forwardRef<any, {
  props: any;
  element: React.ComponentType<any>;
  _layerId?: string;
}>(
  ({ props, element: Element, _layerId }, ref) => {
    const contextData = useContextData();

    // Resolve all strings in props (deeply)
    const resolvedProps = React.useMemo(
      () => resolveStringsDeep(props, contextData),
      [props, contextData]
    );

    // Expose context imperatively if needed by the engine
    React.useImperativeHandle(ref, () => ({
      contextdata: contextData?.context,
    }));

    // Optional debug hook
    (window as any).contextDatas ||= {};
    (window as any).contextDatas[_layerId] = contextData;

    return (
      <div className="wrapper">
        <Element {...resolvedProps} ref={ref} />
      </div>
    );
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
}> = memo(
  ({ layer, componentRegistry, editorConfig }) => {
    const isLayerAPage = useLayerStore((state) => state.isLayerAPage(layer.id));
    const registry = useEditorStore((state) => state.registry);
    const dndContext = useSafeDndContext();

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

    const resolvedProps = layer.props;

    const childProps: Record<string, PropValue> = useMemo(() => ({
      ...resolvedProps,
    }), [resolvedProps]);

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
      // String children will be processed by the Wrapper component
      childProps.children = layer.children;
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

    function WrappedComponentChild(props: any) {
      return isPrimitive ? (
        // @ts-expect-error
        <Component
          ref={ref}
          id={layer.id}
          data-testid={layer.id}
          data-layer-id={layer.id}
          {...childProps}
          {...props}
        />
      ) : (
        <ErrorSuspenseWrapper key={layer.id} id={layer.id}>
          {
            // @ts-expect-error
            <Component
              ref={ref}
              data-testid={layer.id}
              data-layer-id={layer.id}
              {...childProps}
              {...props}
            />
          }
        </ErrorSuspenseWrapper>
      );
    }

    const WrappedComponent = (
      <Wrapper
        _layerId={layer.id}
        props={childProps}
        element={WrappedComponentChild}
        ref={ref}
      />
    );

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

