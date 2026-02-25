import React from 'react';
import { DevProfiler } from '@/components/ui/ui-builder/internal/components/dev-profiler';
import {
  type EditorConfig,
  RenderLayer,
} from '@/components/ui/ui-builder/internal/utils/render-utils';
import type {
  ComponentLayer,
  ComponentRegistry,
} from '@/components/ui/ui-builder/types';
import { useEditorStore } from '@/lib/ui-builder/store/editor-store';
import {
  findLayerInTree,
  getEffectiveCanvasRootId as resolveEffectiveCanvasRootId,
} from '@/lib/ui-builder/store/editor-utils';

interface LayerRendererProps<
  TRegistry extends ComponentRegistry = ComponentRegistry,
> {
  className?: string;
  page: ComponentLayer;
  editorConfig?: EditorConfig;
  componentRegistry: TRegistry;
}

const LayerRenderer = React.memo<LayerRendererProps>(function LayerRenderer({
  className,
  page,
  editorConfig,
  componentRegistry,
}) {
  const focusStack = useEditorStore((state) => state.focusStack);
  const isLayerInFocusScope = useEditorStore(
    (state) => state.isLayerInFocusScope,
  );

  const effectiveCanvasRootId = React.useMemo(
    () => resolveEffectiveCanvasRootId(page, focusStack),
    [page, focusStack],
  );
  const effectiveCanvasRootLayer = React.useMemo(() => {
    if (!effectiveCanvasRootId) {
      return page;
    }
    return findLayerInTree(page, effectiveCanvasRootId) ?? page;
  }, [page, effectiveCanvasRootId]);

  const scopedEditorConfig = React.useMemo(() => {
    if (!editorConfig) {
      return undefined;
    }

    if (isLayerInFocusScope(page, editorConfig.selectedLayer?.id)) {
      return editorConfig;
    }

    return {
      ...editorConfig,
      selectedLayer: effectiveCanvasRootLayer,
    } satisfies EditorConfig;
  }, [editorConfig, page, isLayerInFocusScope, effectiveCanvasRootLayer]);

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: lint debt cleanup
    <DevProfiler id="LayerRenderer" threshold={30}>
      <div className={className}>
        <RenderLayer
          layer={effectiveCanvasRootLayer}
          editorConfig={scopedEditorConfig}
          componentRegistry={componentRegistry}
        />
      </div>
    </DevProfiler>
  );
}) as <TRegistry extends ComponentRegistry = ComponentRegistry>(
  props: LayerRendererProps<TRegistry>,
) => JSX.Element;

export default LayerRenderer;
